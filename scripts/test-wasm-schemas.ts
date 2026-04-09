/**
 * WASM schema integration tests — validates that the config shapes the frontend
 * sends are accepted by the WASM modules without parse errors.
 *
 * Run: bun run scripts/test-wasm-schemas.ts
 *
 * Each WASM module is tested in a separate subprocess to avoid cross-module
 * initialization issues.
 */

import { $ } from "bun";

const tests: Array<{ name: string; code: string }> = [
    {
        name: "chess-corners-wasm",
        code: `
const mod = await import('chess-corners-wasm');
await mod.default();
const d = mod.ChessDetector.multiscale();
d.set_threshold(0.2);
d.free();
console.log('PASS: multiscale detector created with threshold');
process.exit(0);
`,
    },
    {
        name: "@vitavision/ringgrid",
        code: `
const mod = await import('@vitavision/ringgrid');
await mod.default();
const def = JSON.parse(mod.default_board_json());
if (def.schema !== 'ringgrid.target.v4' || typeof def.name !== 'string')
    throw new Error('default board missing schema/name');
console.log('PASS: default board JSON has schema + name');
const user = { rows: 15, long_row_cols: 14, pitch_mm: 8.0, marker_outer_radius_mm: 5.6, marker_inner_radius_mm: 3.2, marker_ring_width_mm: 0.8 };
const merged = { ...def, ...user };
const det = new mod.RinggridDetector(JSON.stringify(merged));
det.free();
console.log('PASS: detector created from merged user + default board JSON');
process.exit(0);
`,
    },
    {
        name: "calib-targets: chessboard",
        code: `
function deepMerge(t, s) {
    const o = { ...t };
    for (const k of Object.keys(s)) {
        const sv = s[k], tv = t[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv))
            o[k] = deepMerge(tv, sv);
        else o[k] = sv;
    }
    return o;
}
const mod = await import('calib-targets-wasm');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
const chessCfg = deepMerge(mod.default_chess_config(), { threshold_value: 0.2 });
const params = deepMerge(mod.default_chessboard_params(), {
    min_corner_strength: 0.2, completeness_threshold: 0.1,
    expected_rows: 7, expected_cols: 11,
    graph: { min_spacing_pix: 5, max_spacing_pix: 50 },
});
mod.detect_chessboard(32, 32, gray, chessCfg, params);
console.log('PASS: detect_chessboard accepts merged params');
process.exit(0);
`,
    },
    {
        name: "calib-targets: charuco",
        code: `
function deepMerge(t, s) {
    const o = { ...t };
    for (const k of Object.keys(s)) {
        const sv = s[k], tv = t[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv))
            o[k] = deepMerge(tv, sv);
        else o[k] = sv;
    }
    return o;
}
const mod = await import('calib-targets-wasm');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
const chessCfg = deepMerge(mod.default_chess_config(), { threshold_value: 0.2 });
const cbDefaults = mod.default_chessboard_params();
const params = {
    px_per_square: 40,
    board: { rows: 22, cols: 22, cell_size: 4.8, marker_size_rel: 0.75, dictionary: 'DICT_4X4_1000', marker_layout: 'opencv_charuco' },
    chessboard: deepMerge(cbDefaults, {
        min_corner_strength: 0.2, expected_rows: 22, expected_cols: 22,
        completeness_threshold: 0.05,
        graph: { min_spacing_pix: 40, max_spacing_pix: 160, k_neighbors: 8, orientation_tolerance_deg: 12.5 },
    }),
};
try {
    mod.detect_charuco(32, 32, gray, chessCfg, params);
    console.log('PASS: detect_charuco accepts merged params');
} catch(e) {
    // "chessboard not detected" is expected on a blank image — that's a detection
    // failure, not a schema error. Schema was parsed successfully.
    if (String(e).includes('chessboard not detected')) {
        console.log('PASS: detect_charuco accepts merged params (no board in blank image, as expected)');
    } else {
        throw e;
    }
}
process.exit(0);
`,
    },
    {
        name: "calib-targets: markerboard",
        code: `
function deepMerge(t, s) {
    const o = { ...t };
    for (const k of Object.keys(s)) {
        const sv = s[k], tv = t[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv))
            o[k] = deepMerge(tv, sv);
        else o[k] = sv;
    }
    return o;
}
const mod = await import('calib-targets-wasm');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
const chessCfg = deepMerge(mod.default_chess_config(), { threshold_value: 0.2 });
const params = deepMerge(mod.default_marker_board_params(), {
    layout: { rows: 22, cols: 22, circles: [{ cell: { i: 11, j: 11 }, polarity: 'black' }, { cell: { i: 12, j: 11 }, polarity: 'white' }, { cell: { i: 12, j: 12 }, polarity: 'white' }] },
    chessboard: { min_corner_strength: 0.2, expected_rows: 22, expected_cols: 22, completeness_threshold: 0.05, graph: { min_spacing_pix: 20, max_spacing_pix: 160 } },
    circle_score: { patch_size: 64, min_contrast: 10 },
});
mod.detect_marker_board(32, 32, gray, chessCfg, params);
console.log('PASS: detect_marker_board accepts merged params');
process.exit(0);
`,
    },
    {
        name: "calib-targets: chessboard coordinates (real image)",
        code: `
function deepMerge(t, s) {
    const o = { ...t };
    for (const k of Object.keys(s)) {
        const sv = s[k], tv = t[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv))
            o[k] = deepMerge(tv, sv);
        else o[k] = sv;
    }
    return o;
}
const { PNG } = await import('pngjs');
const { readFileSync } = await import('fs');
const png = PNG.sync.read(readFileSync('public/chessboard.png'));
const mod = await import('calib-targets-wasm');
await mod.default();
const gray = mod.rgba_to_gray(new Uint8Array(png.data), png.width, png.height);
const chessCfg = deepMerge(mod.default_chess_config(), { threshold_value: 0.2 });
const params = deepMerge(mod.default_chessboard_params(), {
    min_corner_strength: 0.2, completeness_threshold: 0.1,
    expected_rows: 7, expected_cols: 11,
    graph: { min_spacing_pix: 5, max_spacing_pix: 50 },
});
const result = mod.detect_chessboard(png.width, png.height, gray, chessCfg, params);
if (!result || !result.detection || result.detection.corners.length === 0)
    throw new Error('no corners detected on real chessboard image');
console.log('PASS: detected ' + result.detection.corners.length + ' corners');
const c = result.detection.corners[0];
// Verify position is [x,y] array — the adapter must handle this
if (!Array.isArray(c.position) || c.position.length !== 2)
    throw new Error('corner.position is not [x,y] array: ' + JSON.stringify(c.position));
const [x, y] = c.position;
if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y))
    throw new Error('corner coordinates are not valid numbers');
if (x < 0 || x > png.width || y < 0 || y > png.height)
    throw new Error('corner coordinates out of image bounds: ' + x + ', ' + y);
console.log('PASS: corner coordinates are valid [x,y] arrays within image bounds');
process.exit(0);
`,
    },
    {
        name: "@vitavision/radsym",
        code: `
const mod = await import('@vitavision/radsym');
await mod.default();
const proc = new mod.RadSymProcessor();
proc.set_radii(new Uint32Array([5, 10, 15]));
proc.set_alpha(2.0);
proc.set_polarity('both');
proc.set_gradient_operator('sobel');
proc.set_nms_radius(5);
proc.set_max_detections(50);
console.log('PASS: RadSymProcessor created with all setters');
const hm = proc.response_heatmap(new Uint8Array(32 * 32 * 4).fill(128), 32, 32, 'magma');
if (hm instanceof Uint8Array && hm.length === 32 * 32 * 4) console.log('PASS: response_heatmap returns correct RGBA');
else { console.error('FAIL: response_heatmap wrong output'); process.exit(1); }
proc.free();
process.exit(0);
`,
    },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    try {
        const result = await $`bun -e ${test.code}`.text();
        console.log(result.trim());
        const lines = result.trim().split("\n");
        passed += lines.filter((l) => l.startsWith("PASS:")).length;
    } catch (e: unknown) {
        const err = e as { stderr?: { toString(): string } };
        console.error(`  FAIL: ${test.name} crashed`);
        if (err.stderr) console.error(`  ${err.stderr.toString().trim()}`);
        failed++;
    }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
