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
        name: "@vitavision/chess-corners",
        code: `
const mod = await import('@vitavision/chess-corners');
await mod.default();
// chess-corners 0.11 uses the typed DetectorConfig builder (the flat
// set_* setters were removed). Validate every config combination the UI's
// ChessCornersConfigForm can produce is accepted by ChessDetector.withConfig.
function makeRefiner(kind) {
    if (kind === 'forstner') return mod.ChessRefiner.withForstner(new mod.ForstnerConfig());
    if (kind === 'saddle_point') return mod.ChessRefiner.withSaddlePoint(new mod.SaddlePointConfig());
    return mod.ChessRefiner.withCenterOfMass(new mod.CenterOfMassConfig());
}
for (const refiner of ['center_of_mass', 'forstner', 'saddle_point']) {
    for (const upscaleFactor of [0, 2, 3, 4]) {
        for (const broadMode of [false, true]) {
            const cfg = mod.DetectorConfig.chessMultiscale();
            cfg.threshold = mod.Threshold.relative(0.2);
            cfg.upscale = upscaleFactor >= 2 ? mod.UpscaleConfig.fixed(upscaleFactor) : mod.UpscaleConfig.disabled();
            cfg.multiscale.levels = 4;
            cfg.multiscale.minSize = 128;
            const chess = cfg.strategy.chess;
            chess.nmsRadius = 2;
            chess.minClusterSize = 2;
            chess.ring = broadMode ? mod.ChessRing.Broad : mod.ChessRing.Canonical;
            chess.refiner = makeRefiner(refiner);
            const d = mod.ChessDetector.withConfig(cfg);
            d.free();
        }
    }
}
console.log('PASS: DetectorConfig builder accepts all UI-config combinations');
process.exit(0);
`,
    },
    {
        name: "@vitavision/ringgrid",
        code: `
const mod = await import('@vitavision/ringgrid');
await mod.default();

// 1. Schema check: v5, not the legacy flat v4.
const def = JSON.parse(mod.default_board_json());
if (def.schema !== 'ringgrid.target.v5' || typeof def.name !== 'string')
    throw new Error('default board missing schema/name: ' + JSON.stringify(def));
console.log('PASS: default board JSON has schema ringgrid.target.v5 + name');

// 2. Build a board through the same nested-aware merge path the adapter/worker
// use (wasmWorker.ts handleRinggrid), with non-default values, and assert the
// nested structure is correct AND that untouched sibling keys (lattice.kind,
// coding.kind) survive — a shallow {...target, ...source} merge would wipe them.
function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
        const sv = source[key], tv = target[key];
        if (sv !== null && typeof sv === 'object' && !Array.isArray(sv) && tv !== null && typeof tv === 'object' && !Array.isArray(tv))
            out[key] = deepMerge(tv, sv);
        else out[key] = sv;
    }
    return out;
}
const adapterBoardOverride = {
    lattice: { rows: 9, long_row_cols: 8, pitch_mm: 12 },
    marker: { outer_radius_mm: 5.6, inner_radius_mm: 3.2 },
    coding: { ring_width_mm: 1.0 },
};
const merged = deepMerge(def, adapterBoardOverride);
if (merged.lattice.kind !== 'hex')
    throw new Error('lattice.kind was dropped by merge: ' + JSON.stringify(merged.lattice));
if (merged.lattice.rows !== 9 || merged.lattice.long_row_cols !== 8 || merged.lattice.pitch_mm !== 12)
    throw new Error('lattice override not applied: ' + JSON.stringify(merged.lattice));
if (merged.coding.kind !== 'coded16' || merged.coding.ring_width_mm !== 1.0)
    throw new Error('coding merge incorrect: ' + JSON.stringify(merged.coding));
if (merged.marker.outer_radius_mm !== 5.6 || merged.marker.inner_radius_mm !== 3.2)
    throw new Error('marker override not applied: ' + JSON.stringify(merged.marker));
console.log('PASS: nested board merge applies overrides while preserving lattice.kind/coding.kind');
const det0 = new mod.RinggridDetector(JSON.stringify(merged));
det0.free();
console.log('PASS: detector constructs from merged non-default v5 board');

// 3. Round-trip: update_config with an overlay carrying non-default values
// under the new advanced.* nesting, then read back config_json() and assert
// those exact values are present AND that untouched sibling fields survive
// (catches a knob being silently dropped by the advanced-block move).
const det = new mod.RinggridDetector(mod.default_board_json());
const overlay = {
    marker_scale: { diameter_min_px: 22 },
    advanced: { decode: { min_decode_confidence: 0.55 } },
};
det.update_config(JSON.stringify(overlay));
const effective = JSON.parse(det.config_json());
if (effective.marker_scale.diameter_min_px !== 22)
    throw new Error('marker_scale.diameter_min_px overlay was dropped: ' + JSON.stringify(effective.marker_scale));
if (effective.advanced.decode.min_decode_confidence !== 0.55)
    throw new Error('advanced.decode.min_decode_confidence overlay was dropped: ' + JSON.stringify(effective.advanced.decode));
if (effective.marker_scale.diameter_max_px !== 66)
    throw new Error('unrelated sibling field diameter_max_px was clobbered: ' + effective.marker_scale.diameter_max_px);
if (effective.advanced.decode.max_decode_dist !== 3)
    throw new Error('unrelated sibling field max_decode_dist was clobbered: ' + effective.advanced.decode.max_decode_dist);
console.log('PASS: update_config round-trip preserves overlay values under advanced.* and leaves siblings untouched');
det.free();

// 4. Real-image detection: run detect_adaptive_rgba on public/ringgrid.png and
// assert markers are actually detected, not merely that the call returns.
const { PNG } = await import('pngjs');
const { readFileSync } = await import('fs');
const png = PNG.sync.read(readFileSync('public/ringgrid.png'));
const detImg = new mod.RinggridDetector(mod.default_board_json());
const resultJson = detImg.detect_adaptive_rgba(new Uint8Array(png.data), png.width, png.height);
const result = JSON.parse(resultJson);
const markers = result.detected_markers ?? [];
if (markers.length === 0)
    throw new Error('no markers detected on public/ringgrid.png');
console.log('PASS: detected ' + markers.length + ' markers on real ringgrid.png image');
detImg.free();

process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: chessboard schema",
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
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);

// 0.10.1: ChessConfig.threshold is a tagged Rust enum (exactly one variant
// key — { absolute: N } or { relative: N }), NOT the old flat
// threshold_value field. A naive deepMerge unions the default's variant key
// ({ absolute: 15 }) with an override's ({ relative: 0.2 }) and the WASM
// deserializer rejects that ("invalid length 2, expected 1"). Mirror
// wasmWorker.ts's handleCalibTarget fix: merge normally, then replace
// threshold/upscale wholesale when overridden.
function buildChessCfg(overrides) {
    const merged = deepMerge(mod.default_chess_config(), overrides);
    if (overrides.threshold !== undefined) merged.threshold = overrides.threshold;
    if (overrides.upscale !== undefined) merged.upscale = overrides.upscale;
    return merged;
}
const chessCfg = buildChessCfg({ threshold: { relative: 0.2 } });
if (chessCfg.threshold.relative !== 0.2 || 'absolute' in chessCfg.threshold)
    throw new Error('threshold override was merged instead of replaced: ' + JSON.stringify(chessCfg.threshold));
console.log('PASS: tagged threshold enum replaced wholesale, not merged with the default variant');

// The legacy flat fields the old ChessConfig/DetectorParams schemas used
// (expected_rows, completeness_threshold, graph, chess) are silently ignored
// under 0.10.1 — keep them in the merge to confirm they don't cause a schema
// error (forward-compat with any stale adapter payload), while the current
// stable-core keys (min_corner_strength, max_fit_rms_ratio, ...) still apply.
const params = deepMerge(mod.default_chessboard_params(), {
    min_corner_strength: 0.2, completeness_threshold: 0.1,
    expected_rows: 7, expected_cols: 11,
    max_fit_rms_ratio: 0.5, peak_min_separation_deg: 60, min_peak_weight_fraction: 0.02,
    graph: { min_spacing_pix: 5, max_spacing_pix: 50 },
});
mod.detect_chessboard(32, 32, gray, chessCfg, params);
console.log('PASS: detect_chessboard accepts merged params (forward-compatible with legacy fields)');

// Regression guard for the threshold_value → threshold.relative fix: prove
// the override is actually wired into detection sensitivity on a real image,
// not silently dropped like the old flat threshold_value field was.
const { PNG } = await import('pngjs');
const { readFileSync } = await import('fs');
const png = PNG.sync.read(readFileSync('public/chessboard.png'));
const grayReal = mod.rgba_to_gray(new Uint8Array(png.data), png.width, png.height);
const paramsReal = mod.default_chessboard_params();
const lenient = mod.detect_chessboard(png.width, png.height, grayReal, buildChessCfg({ threshold: { relative: 0.2 } }), paramsReal);
const strict = mod.detect_chessboard(png.width, png.height, grayReal, buildChessCfg({ threshold: { relative: 0.9 } }), paramsReal);
if (!lenient || lenient.corners.length === 0)
    throw new Error('lenient threshold found no corners on public/chessboard.png');
if (strict !== null && strict !== undefined && strict.corners.length === lenient.corners.length)
    throw new Error('threshold.relative override had no effect on detection (chessCfg is not reaching the detector)');
console.log('PASS: chessCfg.threshold.relative override changes real detection sensitivity (lenient=' + lenient.corners.length + ' corners, strict=' + (strict ? strict.corners.length : 'null') + ')');
process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: charuco",
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
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
// threshold is a tagged enum ({ absolute: N } | { relative: N }) — see the
// "chessboard schema" test above for why this can't be a plain deepMerge.
const chessCfg = { ...mod.default_chess_config(), threshold: { relative: 0.2 } };
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
        name: "@vitavision/calib-targets: markerboard",
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
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
// threshold is a tagged enum ({ absolute: N } | { relative: N }) — see the
// "chessboard schema" test above for why this can't be a plain deepMerge.
const chessCfg = { ...mod.default_chess_config(), threshold: { relative: 0.2 } };
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
        name: "@vitavision/calib-targets: chessboard coordinates (real image)",
        code: `
const { PNG } = await import('pngjs');
const { readFileSync } = await import('fs');
const png = PNG.sync.read(readFileSync('public/chessboard.png'));
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = mod.rgba_to_gray(new Uint8Array(png.data), png.width, png.height);
// 0.10.1 flattened ChessboardDetectionResult to { corners, cell_size } — the
// target/detection wrapper is gone entirely. The worker re-wraps this into
// the internal { detection: { kind, corners } } shape; here we validate the
// raw WASM shape directly so a future package change is caught early.
const result = mod.detect_chessboard(png.width, png.height, gray, mod.default_chess_config(), mod.default_chessboard_params());
const corners = result?.corners;
if (!corners || corners.length === 0)
    throw new Error('no corners detected on real chessboard image');
// Regression guard: 0.10.1 must detect the same 77 corners 0.8.0 found on
// this image (verified same positions, not just same count).
if (corners.length !== 77)
    throw new Error('expected exactly 77 corners on public/chessboard.png (0.8.0 parity), got ' + corners.length);
console.log('PASS: detected ' + corners.length + ' corners (matches 0.8.0 baseline)');
const c = corners[0];
if (!Array.isArray(c.position) || c.position.length !== 2)
    throw new Error('corner.position is not [x,y] array: ' + JSON.stringify(c.position));
const [x, y] = c.position;
if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y))
    throw new Error('corner coordinates are not valid numbers');
if (x < 0 || x > png.width || y < 0 || y > png.height)
    throw new Error('corner coordinates out of image bounds: ' + x + ', ' + y);
console.log('PASS: corner coordinates are valid [x,y] arrays within image bounds');
// 0.10.1 renamed the grid coordinate from GridCoords{i,j} to Coord{u,v}.
if (!c.grid || typeof c.grid.u !== 'number' || typeof c.grid.v !== 'number')
    throw new Error('corner.grid is missing or malformed (expected {u,v}): ' + JSON.stringify(c.grid));
console.log('PASS: corner.grid is a {u,v} Coord (0.10.1 rename from {i,j})');
process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: puzzleboard defaults + round-trip",
        code: `
const mod = await import('@vitavision/calib-targets');
await mod.default();

const params = mod.default_puzzleboard_params(10, 10);
if (typeof params !== 'object' || params === null)
    throw new Error('default_puzzleboard_params returned non-object: ' + typeof params);
const keys = Object.keys(params);
for (const k of ['px_per_square', 'chessboard', 'board', 'decode']) {
    if (!keys.includes(k))
        throw new Error('missing key: ' + k + ' in ' + JSON.stringify(keys));
}
console.log('PASS: default_puzzleboard_params(10,10) returns object with px_per_square, chessboard, board, decode');
if (params.board.rows !== 10 || params.board.cols !== 10)
    throw new Error('board rows/cols mismatch: ' + JSON.stringify(params.board));
if (params.decode?.search_mode?.kind !== 'full')
    throw new Error('expected default decode.search_mode.kind=full, got: ' + JSON.stringify(params.decode?.search_mode));
console.log('PASS: board=10x10 and decode.search_mode.kind=full');

// A deterministic round-trip using a library-rendered board, which exercises
// the detect_puzzleboard contract without depending on any committed asset.
const { PNG } = await import('pngjs');
const pngBytes = mod.render_puzzleboard_png(10, 10, 20, 150);
const rendered = PNG.sync.read(Buffer.from(pngBytes));
const gray = mod.rgba_to_gray(new Uint8Array(rendered.data), rendered.width, rendered.height);
const result = mod.detect_puzzleboard(rendered.width, rendered.height, gray, null, params);
if (!result?.corners?.length)
    throw new Error('no corners detected on rendered round-trip puzzleboard');
console.log('PASS: detected ' + result.corners.length + ' puzzleboard corners on rendered round-trip (bit_error_rate ' + result.decode.bit_error_rate.toFixed(3) + ')');
const c = result.corners[0];
if (!Array.isArray(c.position) || c.position.length !== 2)
    throw new Error('corner.position is not [x,y] array: ' + JSON.stringify(c.position));
// 0.10.1 renamed the grid coordinate from GridCoords{i,j} to Coord{u,v}.
if (!c.grid || typeof c.grid.u !== 'number' || typeof c.grid.v !== 'number')
    throw new Error('corner.grid is missing or malformed (expected {u,v}): ' + JSON.stringify(c.grid));
console.log('PASS: corner has [x,y] position and {u,v} grid index');

// Real-photo decode, via the exact path the worker uses. The plain
// detect_puzzleboard throws on failure, but _with_diagnostics resolves
// \`result\` to *undefined* and still returns diagnostics — so the worker calls
// the diagnostics variant (for observed_edges) and re-raises itself. Both
// halves of that contract are asserted here.
//
// The board self-locates against a master map: params.board rows/cols do not
// constrain detection (verified — 4x4 through 30x30 all yield 361 corners),
// which is why a mismatched 10x10 declaration is fine.
const { readFileSync } = await import('fs');
const photo = PNG.sync.read(readFileSync('public/author_like_oblique.png'));
const photoGray = mod.rgba_to_gray(new Uint8Array(photo.data), photo.width, photo.height);
const unwrap = (v) => v instanceof Map
    ? Object.fromEntries([...v].map(([k, x]) => [k, unwrap(x)]))
    : Array.isArray(v) ? v.map(unwrap) : v;
const diag = unwrap(mod.detect_puzzleboard_with_diagnostics(photo.width, photo.height, photoGray, null, params));
if (diag?.result == null)
    throw new Error('public/author_like_oblique.png failed to decode (result is ' + diag?.result + ')');
if (diag.result.corners.length !== 361)
    throw new Error('expected 361 corners on public/author_like_oblique.png, got ' + diag.result.corners.length);
if (diag.result.decode.bit_error_rate !== 0)
    throw new Error('expected a clean decode (bit_error_rate 0), got ' + diag.result.decode.bit_error_rate);
console.log('PASS: real photo decodes to 361 corners at bit_error_rate 0');
// observed_edges backs PuzzleboardOverlay's edge-bit markers and lives ONLY on
// the diagnostics side — an empty array here means the overlay renders nothing.
const edges = diag.diagnostics?.observed_edges;
if (!edges?.length)
    throw new Error('diagnostics.observed_edges is empty — PuzzleboardOverlay edge-bit markers would not render');
const e = edges[0];
if (typeof e.row !== 'number' || typeof e.col !== 'number' || (e.orientation !== 'horizontal' && e.orientation !== 'vertical'))
    throw new Error('observed_edges entry is malformed: ' + JSON.stringify(e));
console.log('PASS: diagnostics.observed_edges has ' + edges.length + ' well-formed entries');
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
const hm = proc.response_heatmap(new Uint8Array(32 * 32 * 4).fill(128), 32, 32, 'frst', 'magma');
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
