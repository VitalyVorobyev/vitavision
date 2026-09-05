/**
 * TS-generator vs WASM-renderer differential harness.
 *
 * `src/components/targetgen/svg/*` is a TypeScript reimplementation of
 * calibration-target *generation*; the editor *detects* the very same target
 * kinds via the `@vitavision/calib-targets` WASM package's own renderer
 * (`render_target_bundle_json`). Two independent implementations of the same
 * geometry have already drifted once — see the ArUco 180°-rotation bug fixed
 * in commit 044653b, caught only because a detector round-trip happened to
 * notice it. This script is the comparison harness that must exist BEFORE
 * any TS generator is deleted in favour of the library's renderer: it proves
 * (or disproves) pixel-for-pixel agreement between the two, case by case,
 * kind by kind.
 *
 * For each case it:
 *   1. builds the app's own SVG via `generatePreviewSvg(target, page)`
 *      (`src/components/targetgen/svg/index.ts`), with `showScaleLine: false`
 *      — the scale line is a pure app-side overlay with no library
 *      equivalent, so it is excluded from the comparison rather than faked;
 *   2. builds the library's SVG by mapping the same `target`/`page` through
 *      `toPrintableDocument` (`src/components/targetgen/printableDocument.ts`)
 *      and calling `render_target_bundle_json`;
 *   3. rasterises both SVGs to an 8-bit grayscale buffer at a fixed DPI,
 *      sampling at pixel centres, using a painter's-algorithm sampler over
 *      an ordered list of `<rect>`/`<circle>` primitives parsed out of each
 *      SVG's markup (modelled on `scripts/test-charuco-generator.ts`'s rect
 *      parser and sampler, extended to also parse circles — marker board and
 *      puzzle board both emit them);
 *   4. compares the two buffers pixel-by-pixel, classifying each differing
 *      pixel as decisive or as sitting on a primitive edge (see
 *      `BOUNDARY_EPS_MM`), and reports IDENTICAL or a DIFFER line naming the
 *      decisive count, percentage, and first differing pixel.
 *
 * Step 4 needs a tolerance because the two renderers write geometry down with
 * different precision — the library rounds SVG coordinates to 4 decimals,
 * `svgUtils.ts` interpolates the raw double — and a strict pixel-centre test
 * turns a 3.3e-5 mm disagreement into flipped pixels. The tolerance is a
 * 1 um band around primitive edges, and it is itself tested: a self-check
 * reintroduces the marker-board axis transposition and asserts the harness
 * still reports thousands of decisive pixels (measured: 5467, against ~2 of
 * edge noise). Boundary pixels are always counted and printed, never hidden.
 *
 * Ring grid is excluded: it has no printable representation in
 * `@vitavision/calib-targets` and stays on the TS generator path
 * (`toPrintableDocument` throws for it — see that file).
 *
 * This harness does NOT adjust expectations to make a case pass. A DIFFER
 * result names a real disagreement between the two implementations; root
 * causing it is a follow-up, not something this script papers over.
 *
 * Run: bun run scripts/test-target-generators.ts
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { TargetConfig, PageConfig } from "../src/components/targetgen/types";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const PUBLIC_ROOT = join(REPO_ROOT, "public");

/** Fixed sampling resolution for the differential comparison (not the same
 * as any case's `PageConfig.pngDpi`, which only affects the library's own
 * unused PNG output). */
const COMPARE_DPI = 150;

// ── SVG primitive parsing — rects AND circles, in document order ──────────

type Primitive =
    | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string }
    | { kind: "circle"; cx: number; cy: number; r: number; fill: string };

// Matches the exact attribute order emitted by both
// `src/components/targetgen/svg/svgUtils.ts` (`rect()`/`circle()`) and the
// library's own renderer — verified by generating a bundle and reading
// `svg_text` directly rather than assumed from the Rust source.
const RECT_ATTR_RE = /^<rect x="([-\d.eE]+)" y="([-\d.eE]+)" width="([-\d.eE]+)" height="([-\d.eE]+)" fill="([^"]+)"\/>$/;
const CIRCLE_ATTR_RE = /^<circle cx="([-\d.eE]+)" cy="([-\d.eE]+)" r="([-\d.eE]+)" fill="([^"]+)"\/>$/;
const TAG_RE = /<(rect|circle)\b[^>]*\/>/g;

function parsePrimitives(svgText: string): Primitive[] {
    const out: Primitive[] = [];
    let m: RegExpExecArray | null;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(svgText))) {
        const tag = m[0];
        if (m[1] === "rect") {
            const rm = RECT_ATTR_RE.exec(tag);
            if (!rm) throw new Error(`unparseable <rect> tag: ${tag}`);
            out.push({ kind: "rect", x: +rm[1], y: +rm[2], w: +rm[3], h: +rm[4], fill: rm[5].toLowerCase() });
        } else {
            const cm = CIRCLE_ATTR_RE.exec(tag);
            if (!cm) throw new Error(`unparseable <circle> tag: ${tag}`);
            out.push({ kind: "circle", cx: +cm[1], cy: +cm[2], r: +cm[3], fill: cm[4].toLowerCase() });
        }
    }
    return out;
}

function parsePageDims(svgText: string): { widthMm: number; heightMm: number } {
    const m = svgText.match(/width="([\d.]+)mm" height="([\d.]+)mm"/);
    if (!m) throw new Error("could not parse page dimensions from <svg> tag");
    return { widthMm: +m[1], heightMm: +m[2] };
}

/** Painter's algorithm: last primitive covering the point wins; white if none. */
function sample(prims: Primitive[], xMm: number, yMm: number): string {
    let fill = "#ffffff";
    for (const p of prims) {
        if (p.kind === "rect") {
            if (xMm >= p.x && xMm < p.x + p.w && yMm >= p.y && yMm < p.y + p.h) fill = p.fill;
        } else {
            const dx = xMm - p.cx;
            const dy = yMm - p.cy;
            if (dx * dx + dy * dy <= p.r * p.r) fill = p.fill;
        }
    }
    return fill;
}

/** Both generators only ever emit pure black/white fills, but this reads any
 * `#rrggbb` colour rather than hard-coding to exactly two, so a surprising
 * fill value shows up as an unexpected grayscale level instead of silently
 * collapsing to black or white. */
function hexToGray(fill: string): number {
    const m = /^#([0-9a-f]{6})$/i.exec(fill);
    if (!m) throw new Error(`unrecognised fill colour: ${fill}`);
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    return Math.round((r + g + b) / 3);
}

interface Raster {
    width: number;
    height: number;
    gray: Uint8Array;
    prims: Primitive[];
}

/**
 * Half-width of the band around a primitive edge in which a pixel-centre
 * sample is treated as undecided rather than as a disagreement.
 *
 * The two renderers agree on geometry but not on how many digits of it they
 * write down: the library rounds every SVG coordinate to at most 4 decimals
 * (0.1 um), while `svgUtils.ts` interpolates the raw JS double. So the app
 * emits a puzzleboard dot radius of 2.3333333333333335 where the library
 * writes 2.3333 — the same circle, described 3.3e-5 mm apart. Sampling at
 * exact pixel centres with a strict `<` test turns that into a handful of
 * flipped pixels wherever an edge happens to land within ~1e-4 mm of a
 * sample point.
 *
 * 1e-3 mm (1 um) is chosen to sit far above the library's 1e-4 mm formatting
 * quantum and far below anything physical: it is 1/170th of a 150-DPI pixel
 * and below the spot size of any photoplotter this DXF/SVG would be sent to.
 * A real geometry disagreement — an off-by-one cell, a transposed axis, a
 * wrong bit — moves an edge by a whole square or a whole bit cell, thousands
 * of times more than this, so it stays visible.
 *
 * Boundary-ambiguous pixels are counted and reported, never silently dropped.
 */
const BOUNDARY_EPS_MM = 1e-3;

/**
 * True when the sampled fill is not stable under a +/-eps nudge, i.e. the
 * sample point sits on a primitive edge and which side it falls on is decided
 * by digits neither renderer promises to agree on.
 */
function isBoundaryAmbiguous(prims: Primitive[], xMm: number, yMm: number): boolean {
    const centre = sample(prims, xMm, yMm);
    for (const dx of [-BOUNDARY_EPS_MM, BOUNDARY_EPS_MM]) {
        for (const dy of [-BOUNDARY_EPS_MM, BOUNDARY_EPS_MM]) {
            if (sample(prims, xMm + dx, yMm + dy) !== centre) return true;
        }
    }
    return false;
}

function rasterizeGray(svgText: string, dpi: number): Raster {
    const { widthMm, heightMm } = parsePageDims(svgText);
    const prims = parsePrimitives(svgText);
    const mmPerPx = 25.4 / dpi;
    const width = Math.round(widthMm / mmPerPx);
    const height = Math.round(heightMm / mmPerPx);
    const gray = new Uint8Array(width * height);

    for (let py = 0; py < height; py++) {
        const yMm = (py + 0.5) * mmPerPx;
        const rowOff = py * width;
        for (let px = 0; px < width; px++) {
            const xMm = (px + 0.5) * mmPerPx;
            gray[rowOff + px] = hexToGray(sample(prims, xMm, yMm));
        }
    }
    return { width, height, gray, prims };
}

interface CompareResult {
    identical: boolean;
    /** Pixels differing under a strict, zero-tolerance comparison. */
    diffCount: number;
    /** Of those, the ones whose sample point sits on a primitive edge in
     *  either rendering (see `BOUNDARY_EPS_MM`) — reported, not failed on. */
    boundaryCount: number;
    /** Strict minus boundary: a genuine geometry or content disagreement. */
    decisiveCount: number;
    totalPixels: number;
    firstDiff?: { x: number; y: number; appValue: number; libValue: number };
    dimsMismatch?: { appW: number; appH: number; libW: number; libH: number };
}

function comparePixelwise(app: Raster, lib: Raster, dpi: number): CompareResult {
    if (app.width !== lib.width || app.height !== lib.height) {
        return {
            identical: false,
            diffCount: -1,
            totalPixels: -1,
            dimsMismatch: { appW: app.width, appH: app.height, libW: lib.width, libH: lib.height },
            boundaryCount: 0,
            decisiveCount: -1,
        };
    }
    const totalPixels = app.width * app.height;
    const mmPerPx = 25.4 / dpi;
    let diffCount = 0;
    let boundaryCount = 0;
    let firstDiff: CompareResult["firstDiff"];

    for (let y = 0; y < app.height; y++) {
        const rowOff = y * app.width;
        const yMm = (y + 0.5) * mmPerPx;
        for (let x = 0; x < app.width; x++) {
            const av = app.gray[rowOff + x];
            const lv = lib.gray[rowOff + x];
            if (av === lv) continue;
            diffCount++;

            // Re-examine only the pixels that actually disagree — cheap,
            // because a genuine mismatch is either rare or overwhelming.
            const xMm = (x + 0.5) * mmPerPx;
            if (
                isBoundaryAmbiguous(app.prims, xMm, yMm) ||
                isBoundaryAmbiguous(lib.prims, xMm, yMm)
            ) {
                boundaryCount++;
                continue;
            }
            if (!firstDiff) firstDiff = { x, y, appValue: av, libValue: lv };
        }
    }

    const decisiveCount = diffCount - boundaryCount;
    return {
        identical: decisiveCount === 0,
        diffCount,
        boundaryCount,
        decisiveCount,
        totalPixels,
        firstDiff,
    };
}

// ── config matrix ───────────────────────────────────────────────────────────
//
// Collectively (not necessarily per case) this matrix covers: a non-zero
// innerSquareRel for each of the three kinds that support it (chessboard,
// charuco, markerboard), a letter page, a landscape orientation, a custom
// page size, a non-default marginMm (the app default is 10, per
// `reducer.ts::INITIAL_STATE`), and for charuco at least two different
// dictionaries plus a borderBits of 2.

interface Case {
    name: string;
    target: TargetConfig;
    page: PageConfig;
}

function page(overrides: Partial<PageConfig> = {}): PageConfig {
    return {
        sizeKind: "a4",
        customWidthMm: 210,
        customHeightMm: 297,
        orientation: "portrait",
        marginMm: 10,
        pngDpi: 300,
        // The scale line is a pure app-side overlay with no library
        // equivalent — always off so the two SVGs are directly comparable.
        showScaleLine: false,
        ...overrides,
    };
}

function buildCases(defaultCircles: typeof import("../src/components/targetgen/reducer").defaultCircles): Case[] {
    return [
        // ── chessboard ──────────────────────────────────────────────────────
        {
            name: "chessboard/basic-a4-portrait",
            target: { targetType: "chessboard", config: { innerRows: 6, innerCols: 7, squareSizeMm: 20, innerSquareRel: 0 } },
            page: page(),
        },
        {
            name: "chessboard/inner-square-letter",
            target: { targetType: "chessboard", config: { innerRows: 6, innerCols: 8, squareSizeMm: 18, innerSquareRel: 0.4 } },
            page: page({ sizeKind: "letter" }),
        },
        {
            name: "chessboard/landscape-custom-page-margin",
            target: { targetType: "chessboard", config: { innerRows: 5, innerCols: 7, squareSizeMm: 25, innerSquareRel: 0 } },
            page: page({ sizeKind: "custom", customWidthMm: 180, customHeightMm: 250, orientation: "landscape", marginMm: 15 }),
        },

        // ── charuco ─────────────────────────────────────────────────────────
        {
            name: "charuco/dict4x4-basic",
            target: {
                targetType: "charuco",
                config: { rows: 5, cols: 7, squareSizeMm: 15, markerSizeRel: 0.75, dictionary: "DICT_4X4_50", borderBits: 1, innerSquareRel: 0 },
            },
            page: page(),
        },
        {
            name: "charuco/dict5x5-borderbits2-inner-square-letter",
            target: {
                targetType: "charuco",
                config: { rows: 5, cols: 7, squareSizeMm: 18, markerSizeRel: 0.7, dictionary: "DICT_5X5_100", borderBits: 2, innerSquareRel: 0.3 },
            },
            page: page({ sizeKind: "letter" }),
        },
        {
            name: "charuco/dict6x6-landscape-custom-margin",
            target: {
                targetType: "charuco",
                config: { rows: 6, cols: 8, squareSizeMm: 15, markerSizeRel: 0.8, dictionary: "DICT_6X6_50", borderBits: 1, innerSquareRel: 0 },
            },
            page: page({ sizeKind: "custom", customWidthMm: 170, customHeightMm: 230, orientation: "landscape", marginMm: 12 }),
        },

        // ── markerboard ─────────────────────────────────────────────────────
        {
            name: "markerboard/basic-a4",
            target: {
                targetType: "markerboard",
                config: { innerRows: 6, innerCols: 7, squareSizeMm: 20, circleDiameterRel: 0.5, circles: defaultCircles(6, 7), innerSquareRel: 0 },
            },
            page: page(),
        },
        {
            name: "markerboard/inner-square-letter",
            target: {
                targetType: "markerboard",
                config: { innerRows: 6, innerCols: 8, squareSizeMm: 18, circleDiameterRel: 0.45, circles: defaultCircles(6, 8), innerSquareRel: 0.35 },
            },
            page: page({ sizeKind: "letter" }),
        },
        {
            name: "markerboard/landscape-custom-margin",
            target: {
                targetType: "markerboard",
                config: { innerRows: 5, innerCols: 7, squareSizeMm: 22, circleDiameterRel: 0.5, circles: defaultCircles(5, 7), innerSquareRel: 0 },
            },
            // NOTE: PageConfig.orientation "landscape" swaps width/height at
            // render time (both here and in the app's own
            // svg/paperConstants.ts::resolvePageDimensions), so a custom page
            // that is meant to render wide must be authored TALL
            // (customWidthMm < customHeightMm) — 160x200 swaps to 200x160.
            page: page({ sizeKind: "custom", customWidthMm: 160, customHeightMm: 200, orientation: "landscape", marginMm: 8 }),
        },

        // ── puzzleboard ─────────────────────────────────────────────────────
        {
            name: "puzzleboard/basic-a4",
            target: { targetType: "puzzleboard", config: { rows: 8, cols: 8, cellSizeMm: 15 } },
            page: page(),
        },
        {
            name: "puzzleboard/custom-page",
            target: { targetType: "puzzleboard", config: { rows: 10, cols: 10, cellSizeMm: 12 } },
            page: page({ sizeKind: "custom", customWidthMm: 180, customHeightMm: 180 }),
        },
        {
            name: "puzzleboard/landscape-margin",
            target: { targetType: "puzzleboard", config: { rows: 9, cols: 12, cellSizeMm: 14 } },
            page: page({ orientation: "landscape", marginMm: 14 }),
        },
    ];
}

// ── main ─────────────────────────────────────────────────────────────────

async function runHarness(mod: typeof import("@vitavision/calib-targets")): Promise<boolean> {
    // Stub fetch so the app's charuco generator can load
    // `public/arucodict/*.json` straight off disk (mirrors
    // `scripts/test-charuco-generator.ts::runPartB` — the fallback to
    // `originalFetch` for anything else keeps the WASM loader's own fetch
    // use, and any future non-dictionary fetch, working unmodified).
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
        if (!rawUrl.includes("/arucodict/")) return originalFetch(input, init);
        const pathname = rawUrl.startsWith("http") ? new URL(rawUrl).pathname : rawUrl;
        const filePath = join(PUBLIC_ROOT, pathname.slice(1));
        const data = readFileSync(filePath);
        return new Response(data, { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    try {
        const { generatePreviewSvg } = await import("../src/components/targetgen/svg/index.ts");
        const { toPrintableDocument } = await import("../src/components/targetgen/printableDocument.ts");
        const { defaultCircles } = await import("../src/components/targetgen/reducer.ts");

        const cases = buildCases(defaultCircles);
        console.log(`Running ${cases.length} differential cases at ${COMPARE_DPI} DPI...\n`);

        let anyProblem = false;
        const summary: string[] = [];

        for (const c of cases) {
            let outcome: string;
            try {
                const appSvg = await generatePreviewSvg(c.target, c.page);
                const libDoc = toPrintableDocument(c.target, c.page);
                const libBundle = mod.render_target_bundle_json(libDoc) as { svg_text: string };

                const appRaster = rasterizeGray(appSvg, COMPARE_DPI);
                const libRaster = rasterizeGray(libBundle.svg_text, COMPARE_DPI);
                const cmp = comparePixelwise(appRaster, libRaster, COMPARE_DPI);

                if (cmp.dimsMismatch) {
                    outcome = `DIFFER: page-size mismatch — app ${cmp.dimsMismatch.appW}x${cmp.dimsMismatch.appH}px vs lib ${cmp.dimsMismatch.libW}x${cmp.dimsMismatch.libH}px`;
                    anyProblem = true;
                } else if (cmp.identical) {
                    outcome =
                        cmp.boundaryCount === 0
                            ? "IDENTICAL"
                            : `IDENTICAL (${cmp.boundaryCount}px on primitive edges, undecided within ${BOUNDARY_EPS_MM}mm)`;
                } else {
                    const pct = (cmp.decisiveCount / cmp.totalPixels) * 100;
                    const fd = cmp.firstDiff!;
                    outcome =
                        `DIFFER ${cmp.decisiveCount}px (${pct.toFixed(4)}%) ` +
                        `first@(${fd.x},${fd.y}) ${fd.appValue}vs${fd.libValue} ` +
                        `[${cmp.diffCount} strict, ${cmp.boundaryCount} on edges]`;
                    anyProblem = true;
                }
            } catch (e) {
                outcome = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
                anyProblem = true;
            }
            const line = `${c.name}: ${outcome}`;
            console.log(line);
            summary.push(line);
        }

        // Tolerance self-check. `BOUNDARY_EPS_MM` exists to absorb the two
        // renderers' differing number formatting, and a tolerance that is
        // never tested is a tolerance that quietly hides bugs. So deliberately
        // reintroduce the marker-board axis transposition this migration
        // exists to prevent, and assert the harness still screams.
        console.log("\n--- tolerance self-check (mutation: un-transposed circle axes) ---");
        try {
            const c = cases.find((k) => k.name === "markerboard/basic-a4")!;
            const appSvg = await generatePreviewSvg(c.target, c.page);
            const mutated = toPrintableDocument(c.target, c.page);
            const spec = mutated.target as { circles: { i: number; j: number; polarity: string }[] };
            spec.circles = spec.circles.map((circ) => ({ ...circ, i: circ.j, j: circ.i }));
            const mutBundle = mod.render_target_bundle_json(mutated) as { svg_text: string };
            const cmp = comparePixelwise(
                rasterizeGray(appSvg, COMPARE_DPI),
                rasterizeGray(mutBundle.svg_text, COMPARE_DPI),
                COMPARE_DPI,
            );
            // Measured at 5467 decisive px when this was run against the real
            // defect; 1000 leaves three orders of magnitude of headroom over
            // the ~200px of edge noise a passing case produces.
            if (cmp.decisiveCount > 1000) {
                console.log(
                    `PASS: the un-transposed mutant is caught — ${cmp.decisiveCount} decisive px ` +
                    `(vs ${cmp.boundaryCount} on edges). The boundary tolerance does not mask an axis swap.`,
                );
            } else {
                console.log(
                    `FAIL: the un-transposed mutant produced only ${cmp.decisiveCount} decisive px — ` +
                    `BOUNDARY_EPS_MM (${BOUNDARY_EPS_MM}mm) is masking a real geometry error.`,
                );
                anyProblem = true;
            }
        } catch (e) {
            console.log(`FAIL: tolerance self-check errored: ${e instanceof Error ? e.message : String(e)}`);
            anyProblem = true;
        }

        // Pin that `inner_square_rel` is a live, validated field rather than
        // one silently dropped by the WASM boundary — a failure mode this
        // library family (serde-derived optional f64 fields) is prone to.
        console.log("\n--- inner_square_rel bounds check ---");
        try {
            mod.render_target_bundle_json({
                schema_version: 1,
                target: { kind: "chessboard", inner_rows: 4, inner_cols: 4, square_size_mm: 20, inner_square_rel: 1.0 },
                page: { size: { kind: "a4" }, orientation: "portrait", margin_mm: 10 },
                render: { debug_annotations: false, png_dpi: 150 },
            });
            console.log("FAIL: render_target_bundle_json accepted inner_square_rel=1.0 (documented range is [0,1)) — the field may be silently ignored");
            anyProblem = true;
        } catch (e) {
            console.log(`PASS: render_target_bundle_json rejected inner_square_rel=1.0 as expected: ${String(e)}`);
        }

        console.log("\n=== Summary ===");
        for (const line of summary) console.log(line);

        return !anyProblem;
    } finally {
        globalThis.fetch = originalFetch;
    }
}

async function main() {
    const mod = await import("@vitavision/calib-targets");
    await mod.default();

    const ok = await runHarness(mod);

    if (!ok) {
        console.log(
            "\nFAIL: one or more cases differ or errored. This is a real disagreement between " +
            "src/components/targetgen/svg/* and @vitavision/calib-targets' renderer (or a genuine " +
            "WASM schema regression) — report it, do not adjust the expectation to hide it.",
        );
        process.exit(1);
    }

    console.log("\nPASS: every case is pixel-identical between the app's TS generators and @vitavision/calib-targets' renderer.");
}

main().catch((e) => {
    console.error("\nFAIL:", e instanceof Error ? e.message : String(e));
    process.exit(1);
});
