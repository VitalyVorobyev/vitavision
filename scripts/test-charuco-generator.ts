/**
 * ChArUco marker bit-order verification harness.
 *
 * Proves (against the real WASM library, not against a restated rule) that
 * `src/components/targetgen/aruco/decoder.ts::decodeMarker` unpacks ArUco
 * dictionary codes with the same convention as the reference renderer inside
 * `@vitavision/calib-targets` (`calib-targets-print/src/render.rs::build_charuco`):
 * LSB-first, row-major, set bit = BLACK cell.
 *
 * Run: bun run scripts/test-charuco-generator.ts
 *
 * Part A — golden bit-grid comparison: renders boards with the library's own
 * `render_charuco_bundle`, parses the resulting SVG rects, samples each
 * marker's bit grid at cell centres (painter's algorithm), and asserts
 * `decodeMarker` reproduces that grid exactly. It also computes the MSB-first
 * reading locally and asserts it equals the library grid rotated 180° — this
 * pins the specific bug class (a 180° rotation) so a regression reports that,
 * not a bare mismatch.
 *
 * Part B — end-to-end round trip: generates a ChArUco board with the app's
 * OWN generator (`charucoSvg`), rasterises its SVG into a synthetic grayscale
 * image, and feeds that image to the real WASM detector (`detect_charuco`).
 * Asserts detection succeeds AND the detected marker ids match the ids the
 * generator placed — an assertion that fails before the decoder fix and
 * passes after it (a corner count alone would pass either way).
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const PUBLIC_ROOT = join(REPO_ROOT, "public");

// ── shared SVG-rect helpers ─────────────────────────────────────────────────

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
}

function parseRects(svgText: string): Rect[] {
    const out: Rect[] = [];
    const re = /<rect x="([-\d.eE]+)" y="([-\d.eE]+)" width="([-\d.eE]+)" height="([-\d.eE]+)" fill="([^"]+)"\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(svgText))) {
        out.push({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], fill: m[5].toLowerCase() });
    }
    return out;
}

function parsePageDims(svgText: string): { widthMm: number; heightMm: number } {
    const m = svgText.match(/width="([\d.]+)mm" height="([\d.]+)mm"/);
    if (!m) throw new Error("could not parse page dimensions from <svg> tag");
    return { widthMm: +m[1], heightMm: +m[2] };
}

/** Painter's algorithm: last rect covering the point wins. */
function sample(rects: Rect[], x: number, y: number): string {
    let fill = "#ffffff";
    for (const r of rects) {
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) fill = r.fill;
    }
    return fill;
}

type BitGrid = number[][];

function showGrid(g: BitGrid): string {
    return g.map((row) => row.join("")).join("/");
}

function rot180(g: BitGrid): BitGrid {
    return g.map((row) => [...row].reverse()).reverse();
}

/** Local MSB-first reference decoder — used only to pin the bug's shape. */
function decodeMsbFirst(hex: string, size: number): BitGrid {
    const total = size * size;
    const value = BigInt(hex);
    const grid: BitGrid = [];
    for (let r = 0; r < size; r++) {
        const row: number[] = [];
        for (let c = 0; c < size; c++) {
            const bitIndex = total - 1 - (r * size + c);
            row.push(Number((value >> BigInt(bitIndex)) & 1n));
        }
        grid.push(row);
    }
    return grid;
}

function gridFromBooleanGrid(g: boolean[][]): BitGrid {
    return g.map((row) => row.map((b) => (b ? 1 : 0)));
}

// ── Part A: golden bit-grid comparison against the library ────────────────

interface DictCase {
    dictionary: string;
    rows: number;
    cols: number;
    squareSizeMm: number;
}

async function runPartA(mod: typeof import("@vitavision/calib-targets"), decodeMarker: typeof import("../src/components/targetgen/aruco/decoder").decodeMarker) {
    console.log("\n=== Part A: golden bit-grid comparison against @vitavision/calib-targets ===");

    // DICT_APRILTAG_36h11 has 6x6=36-bit codes (verified against
    // public/arucodict/DICT_APRILTAG_36h11_CODES.json — do not assume 4x4).
    // A bigger square is used for it so the (wider) marker still parses
    // cleanly from the sampled rects.
    const cases: DictCase[] = [
        { dictionary: "DICT_4X4_50", rows: 4, cols: 4, squareSizeMm: 20 },
        { dictionary: "DICT_5X5_100", rows: 4, cols: 4, squareSizeMm: 20 },
        { dictionary: "DICT_APRILTAG_36h11", rows: 4, cols: 4, squareSizeMm: 24 },
    ];

    const markerSizeRel = 0.75;
    // CharucoTargetSpec::new defaults border_bits to 1 and render_charuco_bundle
    // does not expose an override, so the reference boards always use 1.
    const borderBits = 1;
    const dpi = 150;

    // Golden literals captured here are copied verbatim into decoder.test.ts —
    // print them so they can be pasted (also serves as an audit trail).
    console.log("\n--- golden grids for decoder.test.ts (copy verbatim) ---");

    let totalMarkersChecked = 0;

    for (const { dictionary, rows, cols, squareSizeMm } of cases) {
        // Verify the dictionary is actually accepted before relying on it —
        // "never guess an external interface, call it and read the result".
        let bundle: { json_text: string; svg_text: string; png_bytes: Uint8Array; dxf_text: string };
        try {
            bundle = mod.render_charuco_bundle(rows, cols, squareSizeMm, markerSizeRel, dictionary, dpi) as typeof bundle;
        } catch (e) {
            throw new Error(`render_charuco_bundle rejected dictionary ${dictionary}: ${String(e)}`, { cause: e });
        }

        const dictPath = join(PUBLIC_ROOT, "arucodict", `${dictionary}_CODES.json`);
        const dictJson = JSON.parse(readFileSync(dictPath, "utf8")) as { marker_size: number; codes: string[] };
        const markerSize = dictJson.marker_size;

        const rects = parseRects(bundle.svg_text);
        const { widthMm: pageW, heightMm: pageH } = parsePageDims(bundle.svg_text);
        const boardW = cols * squareSizeMm;
        const boardH = rows * squareSizeMm;
        const ox = (pageW - boardW) / 2;
        const oy = (pageH - boardH) / 2;

        const markerMm = squareSizeMm * markerSizeRel;
        const offset = (squareSizeMm - markerMm) / 2;
        const totalCells = markerSize + 2 * borderBits;
        const cellMm = markerMm / totalCells;

        let markerIdx = 0;
        let checkedForDict = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if ((r + c) % 2 === 0) continue; // black square, no marker
                if (markerIdx >= dictJson.codes.length) {
                    markerIdx++;
                    continue;
                }
                const mx = ox + c * squareSizeMm + offset;
                const my = oy + r * squareSizeMm + offset;

                const libGrid: BitGrid = [];
                for (let br = 0; br < markerSize; br++) {
                    const row: number[] = [];
                    for (let bc = 0; bc < markerSize; bc++) {
                        const px = mx + (borderBits + bc + 0.5) * cellMm;
                        const py = my + (borderBits + br + 0.5) * cellMm;
                        row.push(sample(rects, px, py) === "#000000" ? 1 : 0);
                    }
                    libGrid.push(row);
                }

                const hexCode = dictJson.codes[markerIdx];
                const decoded = gridFromBooleanGrid(decodeMarker(hexCode, markerSize));
                if (showGrid(decoded) !== showGrid(libGrid)) {
                    throw new Error(
                        `${dictionary} id=${markerIdx} (code ${hexCode}): decodeMarker() = ${showGrid(decoded)}, ` +
                        `library grid = ${showGrid(libGrid)}`,
                    );
                }

                const msb = decodeMsbFirst(hexCode, markerSize);
                const msbRotated = rot180(msb);
                if (showGrid(msbRotated) !== showGrid(libGrid)) {
                    throw new Error(
                        `${dictionary} id=${markerIdx} (code ${hexCode}): MSB-first reading rotated 180° = ` +
                        `${showGrid(msbRotated)}, does not equal library grid ${showGrid(libGrid)} — bug signature changed`,
                    );
                }

                if (checkedForDict < 3) {
                    console.log(
                        `// ${dictionary} id=${markerIdx} code=${hexCode} (generated by render_charuco_bundle(${rows},${cols},${squareSizeMm},${markerSizeRel},'${dictionary}',${dpi}))`,
                    );
                    console.log(`//   grid: ${showGrid(libGrid)}`);
                }

                markerIdx++;
                checkedForDict++;
                totalMarkersChecked++;
            }
        }

        if (checkedForDict === 0) {
            throw new Error(`${dictionary}: no markers were placed/checked — board too small`);
        }

        console.log(
            `PASS: ${dictionary} — decodeMarker() matches the library grid exactly for all ${checkedForDict} placed markers ` +
            `(marker_size=${markerSize})`,
        );
        console.log(
            `PASS: ${dictionary} — MSB-first reading rotated 180° equals the library grid for all ${checkedForDict} markers ` +
            `(pins the bug as a 180° rotation, not a generic mismatch)`,
        );
    }

    console.log(`\nPASS: Part A checked ${totalMarkersChecked} markers across ${cases.length} dictionaries`);
}

// ── Part B: end-to-end round trip through the real detector ───────────────

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
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
    return out;
}

async function runPartB(mod: typeof import("@vitavision/calib-targets")) {
    console.log("\n=== Part B: end-to-end round trip through the real detector ===");

    // Stub fetch so charucoSvg()'s loadDictionary() can read the dictionary
    // JSON straight off disk instead of hitting a dev server. Only intercept
    // /arucodict/ requests — the WASM loader itself also uses global fetch
    // (to load its .wasm binary) and must pass through untouched.
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
        const { charucoSvg } = await import("../src/components/targetgen/svg/charucoSvg.ts");

        const config = {
            rows: 6,
            cols: 6,
            squareSizeMm: 12,
            markerSizeRel: 0.75,
            dictionary: "DICT_4X4_50" as const,
            borderBits: 1,
            innerSquareRel: 0,
        };
        const page = { widthMm: 80, heightMm: 80, marginMm: 10 };

        const svg = await charucoSvg(config, page);
        const rects = parseRects(svg);
        console.log(`PASS: charucoSvg() generated a board with ${rects.length} rects`);

        // Rasterise the SVG rects into a grayscale Uint8Array, painter's order,
        // axis-aligned. DPI is chosen so each marker bit cell is >= 10px wide:
        // markerMm = 12 * 0.75 = 9mm, totalCells = 4 + 2*1 = 6, cellMm = 1.5mm;
        // at 200 DPI (7.874 px/mm) that is ~11.8 px per bit cell.
        const DPI = 200;
        const scale = DPI / 25.4; // px per mm
        const width = Math.round(page.widthMm * scale);
        const height = Math.round(page.heightMm * scale);
        const gray = new Uint8Array(width * height).fill(255);
        for (const r of rects) {
            const v = r.fill === "#000000" ? 0 : 255;
            const x0 = Math.max(0, Math.round(r.x * scale));
            const y0 = Math.max(0, Math.round(r.y * scale));
            const x1 = Math.min(width, Math.round((r.x + r.w) * scale));
            const y1 = Math.min(height, Math.round((r.y + r.h) * scale));
            for (let y = y0; y < y1; y++) {
                const rowOff = y * width;
                for (let x = x0; x < x1; x++) gray[rowOff + x] = v;
            }
        }
        console.log(`PASS: rasterised board to ${width}x${height} grayscale image at ${DPI} DPI`);

        // Build chessCfg and params exactly the way the worker does
        // (src/lib/wasm/wasmWorker.ts handleCalibTarget, charuco branch):
        // start from WASM module defaults and deep-merge user overrides.
        const chessCfg = deepMerge(
            mod.default_chess_config() as Record<string, unknown>,
            { threshold: 15 },
        );

        const pxPerSquare = Math.round(config.squareSizeMm * scale);
        const cbDefaults = mod.default_chessboard_params() as Record<string, unknown>;
        const userChessboard = {
            min_corner_strength: 15,
            expected_rows: config.rows,
            expected_cols: config.cols,
            completeness_threshold: 0.05,
            graph: { min_spacing_pix: Math.round(pxPerSquare * 0.5), max_spacing_pix: pxPerSquare * 3 },
        };
        const mergedChessboard = deepMerge(cbDefaults, userChessboard);
        const userParams: Record<string, unknown> = {
            px_per_square: pxPerSquare,
            board: {
                rows: config.rows,
                cols: config.cols,
                cell_size: config.squareSizeMm,
                marker_size_rel: config.markerSizeRel,
                dictionary: config.dictionary,
                marker_layout: "opencv_charuco",
            },
            scan: {
                border_bits: config.borderBits,
                inset_frac: 0.06,
                min_border_score: 0.75,
                dedup_by_id: true,
                multi_threshold: true,
            },
            max_hamming: 1,
            min_marker_inliers: 1,
        };
        const params = { ...userParams, chessboard: mergedChessboard };

        // Mirror charucoSvg's own row-major marker-index loop to compute the id
        // the generator placed at each (row, col).
        const expectedIdAt = new Map<string, number>();
        let markerIdx = 0;
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if ((r + c) % 2 === 0) continue;
                expectedIdAt.set(`${r},${c}`, markerIdx);
                markerIdx++;
            }
        }

        const raw = mod.detect_charuco(width, height, gray, chessCfg, params) as {
            corners: unknown[];
            markers: Array<{
                id: number;
                rotation: number;
                gc: { u: number; v: number };
                corners_img: [number, number][];
            }>;
            alignment: unknown;
        };

        console.log(`PASS: detect_charuco() succeeded — ${raw.corners.length} corners, ${raw.markers.length} markers`);
        if (raw.markers.length === 0) {
            throw new Error("detect_charuco returned zero markers — cannot assert id equality on an empty set");
        }
        // Log the raw shape before asserting on a field name — never guess it.
        console.log(`  markers[0] raw shape: ${JSON.stringify(raw.markers[0])}`);

        const boardW = config.cols * config.squareSizeMm;
        const boardH = config.rows * config.squareSizeMm;
        const oxPx = ((page.widthMm - boardW) / 2) * scale;
        const oyPx = ((page.heightMm - boardH) / 2) * scale;
        const sqPx = config.squareSizeMm * scale;

        // The detector reports how far each marker had to be rotated to decode.
        // This is the reported bug's exact signature: with the MSB-first decoder
        // every marker decoded at rotation=2 (180°) as a *different*, cleanly
        // matching id (hamming 0) — so a hamming or "did it decode" check would
        // have passed. rotation=0 is the assertion that names the actual defect.
        const rotated = raw.markers.filter((m) => m.rotation !== 0);
        if (rotated.length > 0) {
            throw new Error(
                `${rotated.length}/${raw.markers.length} markers decoded at a non-zero rotation ` +
                `(${[...new Set(rotated.map((m) => m.rotation))].join(", ")}); ` +
                `rotation=2 means the generator drew every marker upside down`,
            );
        }
        console.log(
            `PASS: all ${raw.markers.length} markers decoded at rotation=0 ` +
            `(the MSB-first decoder produced rotation=2 — markers drawn 180° rotated)`,
        );

        let mismatches = 0;
        for (const m of raw.markers) {
            const cx = (m.corners_img[0][0] + m.corners_img[2][0]) / 2;
            const cy = (m.corners_img[0][1] + m.corners_img[2][1]) / 2;
            const col = Math.floor((cx - oxPx) / sqPx);
            const row = Math.floor((cy - oyPx) / sqPx);
            const expected = expectedIdAt.get(`${row},${col}`);
            if (expected !== m.id) {
                mismatches++;
                console.error(`  MISMATCH: detected id=${m.id} at row=${row} col=${col}, expected id=${expected}`);
            }
        }

        if (mismatches > 0) {
            throw new Error(`${mismatches}/${raw.markers.length} detected marker ids did not match the ids the generator placed`);
        }

        console.log(
            `PASS: all ${raw.markers.length} detected marker ids match the ids charucoSvg() placed ` +
            `(id equality — the assertion that fails before the decoder fix and passes after it)`,
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
    const mod = await import("@vitavision/calib-targets");
    await mod.default();

    const { decodeMarker } = await import("../src/components/targetgen/aruco/decoder.ts");

    await runPartA(mod, decodeMarker);
    await runPartB(mod);

    console.log("\nAll charuco generator/decoder checks passed.");
}

main().catch((e) => {
    console.error("\nFAIL:", e instanceof Error ? e.message : String(e));
    process.exit(1);
});
