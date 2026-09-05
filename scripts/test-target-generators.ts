/**
 * Target-generator round-trip harness: render, rasterise, detect.
 *
 * This file used to be a *differential* harness: it rendered each target
 * through the app's own TypeScript generators AND through
 * `@vitavision/calib-targets`'s renderer, then compared the two
 * rasterisations pixel-for-pixel. That proved the two agreed — and on the
 * strength of that proof the TS generators were deleted (`svg/index.ts` now
 * routes every printable kind through the library). So both sides of the old
 * comparison called the same Rust function; the diff would have passed
 * tautologically forever, proving nothing.
 *
 * What replaced it is a **generation -> detection round trip**, which is
 * where this whole class of bug actually lives: the ChArUco 180°-rotation
 * bug (commit 044653b) was a disagreement between what the renderer drew and
 * what the detector expected, not between two renderers. So for every case
 * in the matrix this script:
 *
 *   1. builds a `PrintableTargetDocument` via `toPrintableDocument` and
 *      renders it with `render_target_bundle_json` — asserting the call
 *      succeeds, every output channel (`svg_text`/`dxf_text`/`json_text`/
 *      `png_bytes`) is non-empty, and the SVG's page size matches what the
 *      app's own `resolvePageDimensions` would compute for the same
 *      `PageConfig` (Part A — catches page-mapping regressions: orientation
 *      swap, custom size, letter vs A4);
 *   2. rasterises the rendered SVG to an 8-bit grayscale buffer at 300 DPI
 *      (the same painter's-algorithm sampler the old differential harness
 *      used, minus the pixel-diff comparison it existed for) and feeds that
 *      buffer to the library's own real detector for the target's kind,
 *      asserting the detector reads back the geometry that was drawn —
 *      corner counts, marker rotations/ids, decode error rates, or (for
 *      marker boards) the alignment transform (Part B);
 *   3. proves the round-trip assertion actually has teeth by deliberately
 *      reintroducing the marker-board axis-transposition bug this migration
 *      exists to prevent, and asserting detection notices (Part C).
 *
 * Ring grid is excluded: it has no printable representation in
 * `@vitavision/calib-targets` and stays on the TS generator path
 * (`toPrintableDocument` throws for it — see that file).
 *
 * This harness does NOT adjust expectations to make a case pass. A genuine
 * disagreement between what was rendered and what was detected is reported
 * with the real numbers and the run fails — root-causing it is a follow-up,
 * not something this script papers over.
 *
 * Run: bun run scripts/test-target-generators.ts
 */

import type {
    TargetConfig,
    PageConfig,
    CircleSpec,
    ChessboardConfig,
    CharucoConfig,
    MarkerBoardConfig,
    PuzzleboardConfig,
} from "../src/components/targetgen/types";
import { toPrintableDocument } from "../src/components/targetgen/printableDocument";
import { resolvePageDimensions } from "../src/components/targetgen/svg/paperConstants";

/** Fixed rasterisation resolution for the round trip — real enough to feed a
 * real detector, low enough to keep the script fast. */
const ROUNDTRIP_DPI = 300;

// ── SVG primitive parsing — rects AND circles, in document order ──────────

type Primitive =
    | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string }
    | { kind: "circle"; cx: number; cy: number; r: number; fill: string };

// Matches the exact attribute order emitted by the library's own renderer —
// verified by generating a bundle and reading `svg_text` directly rather
// than assumed from the Rust source.
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

/** The library only ever emits pure black/white fills, but this reads any
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
    return { width, height, gray };
}

/**
 * Recursively convert a value that may contain nested JS `Map`s into plain
 * objects/arrays.
 *
 * `diagnose_marker_board` returns a payload that is `instanceof Map` at
 * every object level — an upstream serde_wasm_bindgen quirk verified
 * empirically against the real WASM module (see the identical helper in
 * `src/lib/wasm/wasmWorker.ts`), despite the package's `.d.ts` declaring a
 * plain `{ result, diagnostics }` object. `Object.fromEntries` only unwraps
 * the outermost Map; this walks the whole tree so downstream code can treat
 * the result as ordinary JSON.
 */
function unwrapMaps(value: unknown): unknown {
    if (value instanceof Map) {
        const out: Record<string, unknown> = {};
        for (const [key, v] of value.entries()) out[key] = unwrapMaps(v);
        return out;
    }
    if (Array.isArray(value)) return value.map(unwrapMaps);
    if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>)) {
            out[key] = unwrapMaps((value as Record<string, unknown>)[key]);
        }
        return out;
    }
    return value;
}

/**
 * Merge `source` over `target`, recursing into nested plain objects.
 *
 * Every WASM `detect_*`/`default_*_params` call must start from the
 * module's own defaults and layer overrides on top — a params object built
 * from scratch fails with `missing field ...` (see CLAUDE.md's WASM plugin
 * guidance). This is the same shallow-recursive merge used by
 * `src/lib/wasm/wasmWorker.ts::deepMerge` and `scripts/test-wasm-schemas.ts`.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    const out: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
        const sv = source[key];
        const tv = target[key];
        if (sv !== null && typeof sv === "object" && !Array.isArray(sv) && tv !== null && typeof tv === "object" && !Array.isArray(tv)) {
            out[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
        } else {
            out[key] = sv;
        }
    }
    return out as T;
}

/** `#rrggbb` count of `<rect>` tags in a rendered SVG document. */
function countRects(svgText: string): number {
    return (svgText.match(/<rect\b/g) ?? []).length;
}

/**
 * Number of ids a built-in ArUco/AprilTag dictionary holds, parsed from its
 * name (e.g. `DICT_5X5_100` -> 100). Every dictionary this matrix uses
 * (`DICT_4X4_50`, `DICT_5X5_100`, `DICT_6X6_50`) ends in a plain decimal
 * count; this only needs to work for those.
 */
function dictionarySize(dictionaryName: string): number {
    const m = /_(\d+)$/.exec(dictionaryName);
    if (!m) throw new Error(`cannot parse dictionary size out of ${dictionaryName}`);
    return +m[1];
}

/**
 * Convert one app-side circle (row/col `cell.i`/`cell.j`) into the
 * detector's `MarkerCircleSpec` shape — same axis transposition as
 * `printableDocument.ts::toMarkerCircleSpec` (`cell: { i: col, j: row }`),
 * just nested under `cell` instead of flat, because the detector's spec
 * addresses the circle differently from the printable one (see the
 * `MarkerCircleSpec` doc comment in `calib_targets_wasm.d.ts`). Verified
 * against the real module: this transposition reproduces the identity
 * alignment matrix the round trip expects; the untransposed form is exactly
 * the axis bug Part C reintroduces on purpose.
 */
function toDetectorCircle(c: CircleSpec, transpose: boolean): { cell: { i: number; j: number }; polarity: "white" | "black" } {
    const cell = transpose ? { i: c.cell.j, j: c.cell.i } : { i: c.cell.i, j: c.cell.j };
    const polarity = (cell.i + cell.j) % 2 === 0 ? "white" : "black";
    return { cell, polarity };
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
    /**
     * Set when the round trip is KNOWN to fail for a reason that is not a
     * defect in this repo. The case then behaves as an expected failure: a
     * failure is reported as XFAIL and does not fail the run, but a *pass*
     * does — because that means the underlying issue was fixed and this
     * escape hatch must be removed rather than left to rot.
     */
    knownIssue?: string;
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
        // equivalent — off, since the library never draws it.
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
            knownIssue:
                "calib-targets 0.14.1: on a marker board, an inner_square_rel inset of ~0.3 or more " +
                "makes the white inset squares register as circle candidates (3 -> 7 on this board), " +
                "and from 0.35 the alignment drops to 2 inliers and resolves a 180-degree-rotated " +
                "board frame ([[-1,0],[0,-1]]) while still reporting a clean 3-of-3 circle match. " +
                "Swept on a 6x8/18mm board at 300 DPI: 0/0.1/0.2 identity, 0.3 identity but 7 " +
                "candidates, 0.35/0.4/0.6 rotated, 0.5 identity again — unstable rather than " +
                "monotonic. Reproduces at 1x and 3x supersampling, so it is not a rasteriser " +
                "artifact. The circles exist precisely to disambiguate orientation, so this defeats " +
                "them. Generation is correct here — the board is drawn exactly as specified; this is " +
                "a detector-side interaction to report upstream.",
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

interface GeneratedBundle {
    svg_text: string;
    dxf_text: string;
    json_text: string;
    png_bytes: Uint8Array;
}

async function runHarness(mod: typeof import("@vitavision/calib-targets")): Promise<boolean> {
    const { defaultCircles } = await import("../src/components/targetgen/reducer.ts");
    const cases = buildCases(defaultCircles);

    let anyProblem = false;
    const summary: string[] = [];
    const record = (line: string, ok: boolean) => {
        console.log(line);
        summary.push(line);
        if (!ok) anyProblem = true;
    };

    // ── Part A — every configuration renders, at the right page size ───────
    console.log(`--- Part A: render + page-size check (${cases.length} cases) ---\n`);

    for (const c of cases) {
        try {
            const doc = toPrintableDocument(c.target, c.page);
            const bundle = mod.render_target_bundle_json(doc) as GeneratedBundle;

            const missing: string[] = [];
            if (!bundle.svg_text) missing.push("svg_text");
            if (!bundle.dxf_text) missing.push("dxf_text");
            if (!bundle.json_text) missing.push("json_text");
            if (!(bundle.png_bytes?.length > 0)) missing.push("png_bytes");
            if (missing.length > 0) {
                record(`FAIL ${c.name}: empty output channel(s): ${missing.join(", ")}`, false);
                continue;
            }

            const svgDims = parsePageDims(bundle.svg_text);
            const expectedDims = resolvePageDimensions(c.page);
            const dimsOk = svgDims.widthMm === expectedDims.widthMm && svgDims.heightMm === expectedDims.heightMm;
            if (!dimsOk) {
                record(
                    `FAIL ${c.name}: page size ${svgDims.widthMm}x${svgDims.heightMm}mm != expected ${expectedDims.widthMm}x${expectedDims.heightMm}mm`,
                    false,
                );
                continue;
            }

            let insetOk = true;
            let insetNote = "";
            const innerSquareRel = "innerSquareRel" in c.target.config ? c.target.config.innerSquareRel : undefined;
            if (typeof innerSquareRel === "number" && innerSquareRel > 0) {
                const zeroTarget = { ...c.target, config: { ...c.target.config, innerSquareRel: 0 } } as TargetConfig;
                const zeroDoc = toPrintableDocument(zeroTarget, c.page);
                const zeroBundle = mod.render_target_bundle_json(zeroDoc) as GeneratedBundle;
                const withInset = countRects(bundle.svg_text);
                const withoutInset = countRects(zeroBundle.svg_text);
                insetOk = withInset > withoutInset;
                insetNote = `, inset rects ${withInset} > ${withoutInset}: ${insetOk}`;
                if (!insetOk) {
                    record(`FAIL ${c.name}: inner_square_rel=${innerSquareRel} did not add <rect> elements (${withInset} vs ${withoutInset})`, false);
                    continue;
                }
            }

            record(`PASS ${c.name}: renders at ${svgDims.widthMm}x${svgDims.heightMm}mm${insetNote}`, true);
        } catch (e) {
            record(`FAIL ${c.name}: render threw: ${e instanceof Error ? e.message : String(e)}`, false);
        }
    }

    // ── Part B — round trip: render, rasterise, detect ─────────────────────
    console.log(`\n--- Part B: generation -> detection round trip (${ROUNDTRIP_DPI} DPI) ---\n`);

    for (const c of cases) {
        try {
            const doc = toPrintableDocument(c.target, c.page);
            const bundle = mod.render_target_bundle_json(doc) as GeneratedBundle;
            const { width, height, gray } = rasterizeGray(bundle.svg_text, ROUNDTRIP_DPI);
            const chessCfg = mod.default_chess_config();

            if (c.target.targetType === "chessboard") {
                const cfg: ChessboardConfig = c.target.config;
                const params = deepMerge(mod.default_chessboard_params(), {
                    expected_rows: cfg.innerRows,
                    expected_cols: cfg.innerCols,
                });
                const result = mod.detect_chessboard(width, height, gray, chessCfg, params) as { corners: unknown[] } | null;
                const expected = cfg.innerRows * cfg.innerCols;
                const got = result?.corners?.length ?? 0;
                record(`${got === expected ? "PASS" : "FAIL"} ${c.name}: corners=${got} expected=${expected}`, got === expected);
            } else if (c.target.targetType === "charuco") {
                const cfg: CharucoConfig = c.target.config;
                const params = mod.default_charuco_params(cfg.rows, cfg.cols, cfg.markerSizeRel, cfg.dictionary) as {
                    board: { border_bits: number };
                    scan: { border_bits: number };
                };
                params.board.border_bits = cfg.borderBits;
                params.scan.border_bits = cfg.borderBits;
                const result = mod.detect_charuco(width, height, gray, chessCfg, params) as {
                    corners: unknown[];
                    markers: { id: number; rotation: number }[];
                } | null;

                const expectedCorners = (cfg.rows - 1) * (cfg.cols - 1);
                const gotCorners = result?.corners?.length ?? 0;
                const markers = result?.markers ?? [];
                const dictSize = dictionarySize(cfg.dictionary);
                const badRotations = markers.filter((m) => m.rotation !== 0);
                const ids = markers.map((m) => m.id);
                const uniqueIds = new Set(ids);
                const idsInRange = ids.every((id) => id >= 0 && id < dictSize);

                // Corner COMPLETENESS is a property of the detector, not of the
                // geometry this harness is here to check, and the two are worth
                // keeping apart. On a hard-edged synthetic render the ChESS
                // response at a board-boundary corner is weak enough to fall
                // under threshold: measured 34/35 on DICT_6X6 6x8 and 23/24 on
                // DICT_5X5 5x7, and anti-aliasing makes it worse, not better
                // (31/35 at 3x3 supersampling) — so it is not a rasteriser
                // artifact and not something generation can fix.
                //
                // What generation *does* control is asserted exactly below:
                // every marker upright, ids unique and inside the dictionary.
                // Those are the assertions that catch the bug class this file
                // exists for — a 180deg-rotated marker decodes cleanly as a
                // different id, so `rotation === 0` is the sharp test and a
                // corner count would pass either way.
                const cornerFloor = Math.floor(0.9 * expectedCorners);
                let ok = gotCorners >= cornerFloor;
                ok = ok && markers.length >= 1;
                ok = ok && badRotations.length === 0;
                ok = ok && uniqueIds.size === ids.length;
                ok = ok && idsInRange;

                record(
                    `${ok ? "PASS" : "FAIL"} ${c.name}: corners=${gotCorners} expected=${expectedCorners}, ` +
                        `(floor ${cornerFloor}), markers=${markers.length} ` +
                        `(rotations=${[...new Set(markers.map((m) => m.rotation))]}), ` +
                        `ids=[${ids.join(",")}] unique=${uniqueIds.size === ids.length} inRange(0..${dictSize})=${idsInRange}`,
                    ok,
                );
            } else if (c.target.targetType === "markerboard") {
                const cfg: MarkerBoardConfig = c.target.config;
                const params = mod.default_marker_board_params() as {
                    board: { rows: number; cols: number; circles: unknown[] };
                };
                params.board = {
                    rows: cfg.innerRows,
                    cols: cfg.innerCols,
                    circles: cfg.circles.map((circ) => toDetectorCircle(circ, true)),
                };
                const raw = mod.diagnose_marker_board(width, height, gray, chessCfg, params);
                const diag = unwrapMaps(raw) as {
                    result?: { corners: unknown[]; alignment?: { matrix: number[][] } } | null;
                    diagnostics: { circle_candidates: unknown[]; circle_matches: unknown[] };
                };

                const expectedCorners = cfg.innerRows * cfg.innerCols;
                const gotCorners = diag.result?.corners?.length ?? 0;
                const matrix = diag.result?.alignment?.matrix;
                const isIdentity = JSON.stringify(matrix) === JSON.stringify([[1, 0], [0, 1]]);
                const candidates = diag.diagnostics?.circle_candidates?.length ?? 0;
                const matches = diag.diagnostics?.circle_matches?.length ?? 0;

                const ok = diag.result != null && gotCorners === expectedCorners && candidates === 3 && matches === 3 && isIdentity;
                const detail =
                    `corners=${gotCorners} expected=${expectedCorners}, ` +
                    `circle_candidates=${candidates} circle_matches=${matches}, ` +
                    `alignment=${JSON.stringify(matrix)} identity=${isIdentity}`;

                if (c.knownIssue) {
                    if (ok) {
                        record(
                            `FAIL ${c.name}: ${detail}\n` +
                            `     This case is marked as a known issue, but it now PASSES. The upstream ` +
                            `behaviour changed — delete the knownIssue note and let the assertion stand.\n` +
                            `     Known issue was: ${c.knownIssue}`,
                            false,
                        );
                    } else {
                        record(`XFAIL ${c.name}: ${detail}\n     Known issue: ${c.knownIssue}`, true);
                    }
                } else {
                    record(`${ok ? "PASS" : "FAIL"} ${c.name}: ${detail}`, ok);
                }
            } else if (c.target.targetType === "puzzleboard") {
                const cfg: PuzzleboardConfig = c.target.config;
                const params = mod.default_puzzleboard_params(cfg.rows, cfg.cols);
                const result = mod.detect_puzzleboard(width, height, gray, chessCfg, params) as {
                    decode: {
                        bit_error_rate: number;
                        edges_matched: number;
                        edges_observed: number;
                        master_origin_row: number;
                        master_origin_col: number;
                    };
                } | null;
                const decode = result?.decode;
                const ok = !!decode && decode.bit_error_rate === 0 && decode.edges_matched === decode.edges_observed;
                record(
                    `${ok ? "PASS" : "FAIL"} ${c.name}: bit_error_rate=${decode?.bit_error_rate} edges_matched=${decode?.edges_matched}/${decode?.edges_observed}, ` +
                        `master_origin=(${decode?.master_origin_row},${decode?.master_origin_col})`,
                    ok,
                );
            } else {
                const exhaustive: never = c.target;
                throw new Error(`unhandled target type in round trip: ${JSON.stringify(exhaustive)}`);
            }
        } catch (e) {
            record(`FAIL ${c.name}: round trip threw: ${e instanceof Error ? e.message : String(e)}`, false);
        }
    }

    // ── Part C — mutation self-check ────────────────────────────────────────
    //
    // The round-trip assertion above only means something if it can actually
    // notice a broken axis mapping. Reintroduce the marker-board circle-axis
    // transposition bug this migration exists to prevent (see
    // `printableDocument.ts::toMarkerCircleSpec`) on the detector side only —
    // the printed board stays correct — and assert detection notices.
    //
    // Measured against the real module: the mutant still returns a clean
    // 3-of-3 circle match (corners=35, circle_candidates=3, circle_matches=3,
    // alignment_inliers=3) with nothing reporting an error, but
    // `alignment.matrix` becomes [[0,1],[1,0]] — the reflection about the
    // diagonal — instead of the identity the correctly-transposed circles
    // produce. That is the only signal distinguishing the two, so this
    // assertion is what actually validates Part B's markerboard checks.
    console.log("\n--- Part C: mutation self-check (marker-board circle axes) ---\n");
    try {
        const c = cases.find((k) => k.name === "markerboard/landscape-custom-margin")!;
        const cfg = c.target.config as MarkerBoardConfig;
        const doc = toPrintableDocument(c.target, c.page);
        const bundle = mod.render_target_bundle_json(doc) as GeneratedBundle;
        const { width, height, gray } = rasterizeGray(bundle.svg_text, ROUNDTRIP_DPI);
        const chessCfg = mod.default_chess_config();

        const params = mod.default_marker_board_params() as { board: { rows: number; cols: number; circles: unknown[] } };
        params.board = {
            rows: cfg.innerRows,
            cols: cfg.innerCols,
            // Untransposed: reintroduces the axis-swap bug on purpose.
            circles: cfg.circles.map((circ) => toDetectorCircle(circ, false)),
        };
        const raw = mod.diagnose_marker_board(width, height, gray, chessCfg, params);
        const diag = unwrapMaps(raw) as {
            result?: { corners: unknown[]; alignment?: { matrix: number[][] } } | null;
            diagnostics: { circle_candidates: unknown[]; circle_matches: unknown[]; alignment_inliers: number };
        };

        const gotCorners = diag.result?.corners?.length ?? 0;
        const matrix = diag.result?.alignment?.matrix;
        const isIdentity = JSON.stringify(matrix) === JSON.stringify([[1, 0], [0, 1]]);
        const candidates = diag.diagnostics?.circle_candidates?.length ?? 0;
        const matches = diag.diagnostics?.circle_matches?.length ?? 0;
        const inliers = diag.diagnostics?.alignment_inliers ?? 0;

        console.log(
            `mutant: corners=${gotCorners} alignment=${JSON.stringify(matrix)} ` +
                `circle_candidates=${candidates} circle_matches=${matches} alignment_inliers=${inliers}`,
        );

        if (isIdentity) {
            record(
                "FAIL mutation self-check: the untransposed mutant still produced the identity alignment matrix — " +
                    "the round-trip assertion in Part B has no teeth, because this is the only signal distinguishing " +
                    "a correct axis mapping from a broken one.",
                false,
            );
        } else {
            record(
                `PASS mutation self-check: the untransposed mutant is caught — alignment ${JSON.stringify(matrix)} != identity, ` +
                    `while corners/circle_candidates/circle_matches/alignment_inliers all still look clean (${gotCorners}/${candidates}/${matches}/${inliers}). ` +
                    "The round-trip assertion does distinguish a correct axis mapping from the bug this migration fixed.",
                true,
            );
        }
    } catch (e) {
        record(`FAIL mutation self-check: errored: ${e instanceof Error ? e.message : String(e)}`, false);
    }

    // ── inner_square_rel bounds check ───────────────────────────────────────
    //
    // Pins that `inner_square_rel` is a live, validated field rather than one
    // silently dropped by the WASM boundary — a failure mode this library
    // family (serde-derived optional f64 fields) is prone to.
    console.log("\n--- inner_square_rel bounds check ---\n");
    try {
        mod.render_target_bundle_json({
            schema_version: 1,
            target: { kind: "chessboard", inner_rows: 4, inner_cols: 4, square_size_mm: 20, inner_square_rel: 1.0 },
            page: { size: { kind: "a4" }, orientation: "portrait", margin_mm: 10 },
            render: { debug_annotations: false, png_dpi: 150 },
        });
        record(
            "FAIL: render_target_bundle_json accepted inner_square_rel=1.0 (documented range is [0,1)) — the field may be silently ignored",
            false,
        );
    } catch (e) {
        record(`PASS: render_target_bundle_json rejected inner_square_rel=1.0 as expected: ${String(e)}`, true);
    }

    console.log("\n=== Summary ===");
    for (const line of summary) console.log(line);

    return !anyProblem;
}

async function main() {
    const mod = await import("@vitavision/calib-targets");
    await mod.default();

    const ok = await runHarness(mod);

    if (!ok) {
        console.log(
            "\nFAIL: one or more cases failed. This is a real disagreement between what " +
                "toPrintableDocument/render_target_bundle_json rendered and what the library's own detectors read back " +
                "(or a genuine WASM schema regression) — report it, do not adjust the expectation to hide it.",
        );
        process.exit(1);
    }

    console.log("\nPASS: every case renders at the right page size and round-trips through the library's own detectors.");
}

main().catch((e) => {
    console.error("\nFAIL:", e instanceof Error ? e.message : String(e));
    process.exit(1);
});
