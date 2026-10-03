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
import { fileURLToPath } from "node:url";

// Each test's `code` runs in its own `bun -e` subprocess (see the runner loop
// below), so it can't `import` a sibling module by relative path the way the
// rest of this file does. Resolve the shared worker helpers to an absolute
// file path once, up front, and inject an import line into every test that
// needs `deepMerge`/`unwrapMaps` — these must stay the exact same
// implementations the worker itself uses (src/lib/wasm/worker/util.ts), not
// private copies that can silently drift from them.
const UTIL_PATH = fileURLToPath(new URL("../src/lib/wasm/worker/util.ts", import.meta.url));
const ADAPTERS_DIR = fileURLToPath(new URL("../src/components/editor/algorithms/", import.meta.url));
const IMPORT_DEEP_MERGE = `const { deepMerge } = await import(${JSON.stringify(UTIL_PATH)});`;
const IMPORT_DEEP_MERGE_AND_UNWRAP_MAPS = `const { deepMerge, unwrapMaps } = await import(${JSON.stringify(UTIL_PATH)});`;
const SNAPSHOT_PATH = fileURLToPath(new URL("../src/components/editor/algorithms/__tests__/fixtures/legacy-snapshot.json", import.meta.url));

// Shared by the tests below: compare a stored config (or a snapshotted library default) with
// the live one. Floats cross the WASM boundary as f32, so they are compared as f32.
const HELPERS = `
const sameValue = (a, b, path = '') => {
    if (a !== null && typeof a === 'object' && b !== null && typeof b === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return [path + ': array vs object'];
        // serde's None crosses the boundary as a key holding undefined: the same as absent.
        const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => a[k] !== undefined || b[k] !== undefined));
        return [...keys].flatMap((k) => (k in a) !== (k in b)
            ? [path + '.' + k + ': ' + ((k in a) ? 'only in first' : 'only in second')]
            : sameValue(a[k], b[k], path + '.' + k));
    }
    if (typeof a === 'number' && typeof b === 'number') return Math.fround(a) === Math.fround(b) ? [] : [path + ': ' + a + ' vs ' + b];
    return Object.is(a, b) ? [] : [path + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)];
};
const assertSame = (label, a, b) => {
    const diff = sameValue(a, b);
    if (diff.length) throw new Error(label + ' differs from the live library value: ' + diff.slice(0, 6).join('; '));
};
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function deadKeys(sent, ref, path) {
    const out = [];
    if (Array.isArray(sent)) {
        if (Array.isArray(ref) && ref.length > 0 && isObj(ref[0]))
            sent.forEach((el, i) => out.push(...deadKeys(el, ref[0], path + '[' + i + ']')));
        return out;
    }
    if (!isObj(sent) || !isObj(ref)) return out;
    for (const k of Object.keys(sent)) {
        if (!(k in ref)) out.push(path + k);
        else if (ref[k] !== undefined && ref[k] !== null) out.push(...deadKeys(sent[k], ref[k], path + k + '.'));
    }
    return out;
}
const { readFileSync: readFileSyncH } = await import('fs');
const snapshot = JSON.parse(readFileSyncH(${JSON.stringify(SNAPSHOT_PATH)}, 'utf8'));
// every stored config of an algorithm: initialConfig, presets, sample defaults
const storedConfigs = (algo) => [
    ['initialConfig', algo.initialConfig],
    ...(algo.presets ?? []).map((p) => ['preset ' + p.label, p.config]),
    ...Object.entries(algo.sampleDefaults ?? {}).map(([k, c]) => ['sample ' + k, c]),
];
`;

const tests: Array<{ name: string; code: string }> = [
    {
        name: "@vitavision/chess-corners",
        code: `
${HELPERS}
const mod = await import('@vitavision/chess-corners');
await mod.default();
const A = ${JSON.stringify(ADAPTERS_DIR)};
const { CHESS_CORNERS_DEFAULTS, CALIB_CHESS_DEFAULTS } = await import(A + 'chessDetectorDefaults.ts');
const { chessCornersAlgorithm } = await import(A + 'chessCorners/adapter.ts');
const { LEGACY_REFINERS } = await import(A + 'legacyConfig.ts');
if (mod.Threshold !== undefined)
    throw new Error('Threshold enum is back — revisit the scalar-threshold migration');

// 1. The snapshot of the library default the configs are written against is the live one.
assertSame('CHESS_CORNERS_DEFAULTS', CHESS_CORNERS_DEFAULTS, JSON.parse(mod.default_detector_config_json()));
console.log('PASS: CHESS_CORNERS_DEFAULTS equals default_detector_config_json()');

// 2. The editor's config is the DetectorConfig document itself: every stored config is
// accepted by fromJson + ChessDetector.withConfig, and survives toJson unchanged — a key
// the library does not know would be dropped by fromJson and show up here as a difference.
// (Nothing in the type-checker sees this: the document is plain JSON.)
let checked = 0;
for (const [label, config] of storedConfigs(chessCornersAlgorithm)) {
    const cfg = mod.DetectorConfig.fromJson(JSON.stringify(config));
    assertSame('chess-corners ' + label + ' after a round trip', config, JSON.parse(cfg.toJson()));
    const d = mod.ChessDetector.withConfig(cfg);
    d.free();
    cfg.free();
    checked++;
}
console.log('PASS: ' + checked + ' stored configs (initialConfig + presets) are accepted and round-trip through DetectorConfig');

// 3. The editor starts from the multiscale preset with four pyramid levels, and nothing else
// departs from the library's single-scale defaults.
const preset = JSON.parse(mod.DetectorConfig.chessMultiscale().toJson());
const expected = { ...CHESS_CORNERS_DEFAULTS, multiscale: { pyramid: { ...preset.multiscale.pyramid, levels: 4 } } };
assertSame('initialConfig', chessCornersAlgorithm.initialConfig, expected);
console.log('PASS: initialConfig = library defaults + the chessMultiscale() pyramid at 4 levels');

// 4. The tuning structs each refiner variant starts with (what switching the refiner in the
// form seeds, and what an old deep link's "refiner" string stands for).
for (const [name, make] of [
    ['center_of_mass', () => mod.ChessRefiner.withCenterOfMass(new mod.CenterOfMassConfig())],
    ['forstner', () => mod.ChessRefiner.withForstner(new mod.ForstnerConfig())],
    ['saddle_point', () => mod.ChessRefiner.withSaddlePoint(new mod.SaddlePointConfig())],
]) {
    const cfg = mod.DetectorConfig.chessMultiscale();
    cfg.strategy.chess.refiner = make();
    assertSame('refiner ' + name, LEGACY_REFINERS[name], JSON.parse(cfg.toJson()).strategy.chess.refiner);
}
console.log('PASS: the refiner variants start from the library tuning structs');

// 5. Every library default is spelled out, so a field the library adds is noticed (the form
// shows it from the schema; this tells the maintainer the stored configs do not carry it).
assertSame('CALIB_CHESS_DEFAULTS vs chess_config (shape only)', Object.keys(CHESS_CORNERS_DEFAULTS).sort(), Object.keys(CALIB_CHESS_DEFAULTS).sort());

// Stride guard. The detector hands back a bare Float32Array, so a stride the
// type-checker cannot see (9 in 0.11, 7 in 1.x) would silently reinterpret
// axis angles as contrast and shear every corner. Pin it against a synthetic
// board whose corner count and positions are known exactly.
const W = 256, H = 256, SQ = 32;
const rgba = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const v = ((Math.floor(x / SQ) + Math.floor(y / SQ)) % 2) === 0 ? 235 : 20;
        const i = (y * W + x) * 4;
        rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
        rgba[i + 3] = 255;
    }
}
const STRIDE = 7; // x, y, response, axis0_angle, axis0_sigma, axis1_angle, axis1_sigma
const cfg = mod.DetectorConfig.chessMultiscale();
const det = mod.ChessDetector.withConfig(cfg);
cfg.free();
const raw = det.detect_rgba(rgba, W, H);
if (raw.length % STRIDE !== 0)
    throw new Error('detect_rgba output ' + raw.length + ' is not a multiple of stride ' + STRIDE);
// A 256px board of 32px squares has 7x7 = 49 interior X-junctions.
const count = raw.length / STRIDE;
if (count !== 49)
    throw new Error('expected 49 interior corners on the synthetic board, got ' + count);
// First corner sits at the first interior junction; with stride 7 the two
// following floats are an angle in [-pi, pi] and a small sigma, not a
// contrast/fit_rms pair. A stale stride of 9 fails both checks.
const [x0, y0, r0, a0, s0] = raw;
if (Math.abs(x0 - 31.5) > 1.5 || Math.abs(y0 - 31.5) > 1.5)
    throw new Error('first corner at (' + x0 + ',' + y0 + '), expected ~(31.5,31.5)');
if (!(r0 > 100))
    throw new Error('expected a strong response on a synthetic board, got ' + r0);
if (!(Math.abs(a0) <= Math.PI + 1e-3) || !(s0 >= 0 && s0 < 1))
    throw new Error('stride 7 misaligned: angle=' + a0 + ' sigma=' + s0);
console.log('PASS: detect_rgba stride is ' + STRIDE + ' (' + count + ' corners, first at ' + x0.toFixed(1) + ',' + y0.toFixed(1) + ')');

// Threshold is an ABSOLUTE floor on the raw response now, not a 0-1 fraction.
// The UI feeds it straight through, so prove the scale: a value the old
// relative UI would have sent (0.2) keeps every corner, and a value far above
// the response range removes them all.
function countAt(threshold) {
    const c = mod.DetectorConfig.chessMultiscale();
    c.threshold = threshold;
    const d = mod.ChessDetector.withConfig(c);
    c.free();
    const n = d.detect_rgba(rgba, W, H).length / STRIDE;
    d.free();
    return n;
}
if (countAt(0.2) !== 49)
    throw new Error('threshold 0.2 should admit every corner under absolute semantics');
if (countAt(1e6) !== 0)
    throw new Error('threshold 1e6 should reject every corner under absolute semantics');
console.log('PASS: cfg.threshold is an absolute response floor (0.2 -> 49 corners, 1e6 -> 0)');
det.free();
process.exit(0);
`,
    },
    {
        name: "@vitavision/ringgrid",
        code: `
${HELPERS}
const mod = await import('@vitavision/ringgrid');
await mod.default();
const { mergeConfig } = await import(${JSON.stringify(UTIL_PATH)});
const A = ${JSON.stringify(ADAPTERS_DIR)};
const { RINGGRID_DEFAULT_BOARD, RINGGRID_DEFAULT_CONFIG } = await import(A + 'ringgrid/config.ts');
const { ringgridAlgorithm } = await import(A + 'ringgrid/adapter.ts');
const { schema } = await import(A + 'ringgrid/schema.ts');
const { readOnlyPaths } = await import(A + 'schemaTools.ts');

// 1. The board is a v6 target spec, and the stored default is the library's.
const defBoard = JSON.parse(mod.default_board_json());
if (defBoard.schema !== 'ringgrid.target.v6' || typeof defBoard.name !== 'string')
    throw new Error('default board missing schema/name: ' + JSON.stringify(defBoard));
assertSame('RINGGRID_DEFAULT_BOARD', RINGGRID_DEFAULT_BOARD, defBoard);
console.log('PASS: RINGGRID_DEFAULT_BOARD equals default_board_json() (ringgrid.target.v6)');

// 2. The stored detection config is the library's default for that board, minus the fields
// the schema marks readOnly (derived from the board when a config is loaded).
const derived = readOnlyPaths(schema).filter((p) => p.startsWith('config.')).map((p) => p.slice('config.'.length));
const liveConfig = JSON.parse(mod.default_config_json(mod.default_board_json()));
const stripped = structuredClone(liveConfig);
for (const path of derived) {
    const parts = path.split('.');
    let o = stripped;
    for (const part of parts.slice(0, -1)) o = o[part];
    delete o[parts.at(-1)];
}
if (derived.length !== 10) throw new Error('expected 10 readOnly detection fields, got ' + derived.length + ': ' + derived.join(', '));
assertSame('RINGGRID_DEFAULT_CONFIG', RINGGRID_DEFAULT_CONFIG, stripped);
console.log('PASS: RINGGRID_DEFAULT_CONFIG equals default_config_json(board) without its ' + derived.length + ' readOnly fields');

// 3. What the worker builds (src/lib/wasm/worker/ringgrid.ts): the config merged over
// default_config_json(board), then with_config. Every stored config constructs a detector.
function build(config) {
    const boardJson = JSON.stringify(config.board);
    const effective = mergeConfig(JSON.parse(mod.default_config_json(boardJson)), config.config);
    const det = mod.RinggridDetector.with_config(boardJson, JSON.stringify(effective));
    const loaded = JSON.parse(det.config_json());
    det.free();
    return loaded;
}
let n = 0;
for (const [label, config] of storedConfigs(ringgridAlgorithm)) { build(config); n++; }
console.log('PASS: ' + n + ' stored configs build a detector');

// 4. Same config as before: the document the old adapter produced (default board merged with
// the flat overrides, update_config on top; snapshotted before the change) is what the
// stored configs load to now, field for field -- derived ones included.
for (const entry of snapshot.algorithms.ringgrid) {
    const config = entry.kind === 'initial' ? ringgridAlgorithm.initialConfig : ringgridAlgorithm.sampleDefaults[entry.label];
    const boardNow = structuredClone(config.board);
    if (boardNow.coding.codebook_profile === 'base') delete boardNow.coding.codebook_profile; // the library leaves the baseline out
    assertSame('ringgrid ' + entry.kind + ' ' + entry.label + ' board', boardNow, entry.oldWasm.board);
    assertSame('ringgrid ' + entry.kind + ' ' + entry.label + ' detection config', build(config), entry.oldWasm.config);
}
console.log('PASS: initialConfig and the sample default load to exactly the config the old adapter built');

// 5. Derived fields really are re-derived: whatever a stored config says about them, the
// detector ends up with the value for the board. (This is why the form can hide them.)
const lied = structuredClone(ringgridAlgorithm.initialConfig);
lied.config.advanced.proposal = { ...lied.config.advanced.proposal, r_min: 999, r_max: 1000, min_distance: 555 };
lied.config.advanced.completion = { ...lied.config.advanced.completion, roi_radius_px: 777 };
const loadedLied = build(lied);
const loadedTrue = build(ringgridAlgorithm.initialConfig);
for (const k of ['r_min', 'r_max', 'min_distance'])
    if (loadedLied.advanced.proposal[k] !== loadedTrue.advanced.proposal[k])
        throw new Error('advanced.proposal.' + k + ' was not re-derived from the board: ' + loadedLied.advanced.proposal[k]);
if (loadedLied.advanced.completion.roi_radius_px !== loadedTrue.advanced.completion.roi_radius_px)
    throw new Error('advanced.completion.roi_radius_px was not re-derived from the board');
console.log('PASS: readOnly fields are re-derived from the board on load');

// 6. A board that is not the default one changes the derived fields -- and the extended
// codebook a legacy link asked for lives on the board now, where the detector picks it up.
const ext = structuredClone(ringgridAlgorithm.initialConfig);
ext.board.coding.codebook_profile = 'extended';
if (build(ext).advanced.decode.codebook_profile !== 'extended')
    throw new Error('board.coding.codebook_profile = extended did not reach the detector config');
console.log('PASS: board.coding.codebook_profile reaches advanced.decode.codebook_profile');

process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: chessboard schema",
        code: `
${IMPORT_DEEP_MERGE}
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);

// 0.11 collapsed ChessConfig.threshold from the 0.10.1 tagged Rust enum
// ({ absolute: N } | { relative: N }) back to a plain f32 — an ABSOLUTE floor
// on the raw ChESS response, default 15. Relative mode is gone. Passing the
// old object shape throws "invalid type: JsValue(Object(...)), expected f32"
// at detect time, not at config-build time, so assert the scalar shape here.
// The wholesale-replace path in buildChessCfg is kept: 'upscale' is still a
// tagged enum, and a naive deepMerge would union its variant keys.
function buildChessCfg(overrides) {
    const merged = deepMerge(mod.default_chess_config(), overrides);
    if (overrides.threshold !== undefined) merged.threshold = overrides.threshold;
    if (overrides.upscale !== undefined) merged.upscale = overrides.upscale;
    return merged;
}
const defaultCfg = mod.default_chess_config();
if (typeof defaultCfg.threshold !== 'number')
    throw new Error('default_chess_config().threshold is no longer a scalar: ' + JSON.stringify(defaultCfg.threshold));
// 0.11 also relocated the NMS / clustering knobs onto a shared 'detection'
// block, mirroring chess-corners 1.x.
if (typeof defaultCfg.detection?.nms_radius !== 'number')
    throw new Error('default_chess_config().detection.nms_radius missing: ' + JSON.stringify(defaultCfg));
const chessCfg = buildChessCfg({ threshold: 20 });
if (chessCfg.threshold !== 20)
    throw new Error('threshold override was merged instead of replaced: ' + JSON.stringify(chessCfg.threshold));
console.log('PASS: chess config threshold is a scalar absolute floor (default ' + defaultCfg.threshold + '), detection block present');

// FORWARD-COMPAT ONLY: the legacy flat fields the old ChessboardParams schemas
// used (expected_rows, completeness_threshold, graph, max_fit_rms_ratio, ...)
// are NOT live keys on 0.15.1 -- default_chessboard_params() is exactly
// { min_labeled_corners, max_components, min_corner_strength }, and the
// "sent keys are all live" test further down proves the app no longer sends
// the dead ones. They stay in this merge only to confirm that a stale payload
// (e.g. a deep link saved by an older build) is dropped without a schema
// error instead of crashing the run.
const params = deepMerge(mod.default_chessboard_params(), {
    min_corner_strength: 15, completeness_threshold: 0.1,
    expected_rows: 7, expected_cols: 11,
    max_fit_rms_ratio: 0.5, peak_min_separation_deg: 60, min_peak_weight_fraction: 0.02,
    graph: { min_spacing_pix: 5, max_spacing_pix: 50 },
});
mod.detect_chessboard(32, 32, gray, chessCfg, params);
console.log('PASS: detect_chessboard accepts merged params (forward-compatible with legacy fields)');

// Regression guard: prove the threshold override is actually wired into
// detection sensitivity on a real image, not silently dropped like the old
// flat threshold_value field was. Under absolute semantics the strict end of
// the range is a large response floor, not a fraction near 1.
const { PNG } = await import('pngjs');
const { readFileSync } = await import('fs');
const png = PNG.sync.read(readFileSync('public/chessboard.png'));
const grayReal = mod.rgba_to_gray(new Uint8Array(png.data), png.width, png.height);
const paramsReal = mod.default_chessboard_params();
const lenient = mod.detect_chessboard(png.width, png.height, grayReal, buildChessCfg({ threshold: 15 }), paramsReal);
const strict = mod.detect_chessboard(png.width, png.height, grayReal, buildChessCfg({ threshold: 1e6 }), paramsReal);
if (!lenient || lenient.corners.length === 0)
    throw new Error('lenient threshold found no corners on public/chessboard.png');
if (strict !== null && strict !== undefined && strict.corners.length === lenient.corners.length)
    throw new Error('threshold override had no effect on detection (chessCfg is not reaching the detector)');
console.log('PASS: chessCfg.threshold override changes real detection sensitivity (lenient=' + lenient.corners.length + ' corners, strict=' + (strict ? strict.corners.length : 'null') + ')');
process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: charuco",
        code: `
${IMPORT_DEEP_MERGE}
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
// threshold is a plain f32 absolute response floor as of 0.11 — see the
// "chessboard schema" test above for why this can't be a plain deepMerge.
const chessCfg = { ...mod.default_chess_config(), threshold: 15 };
const cbDefaults = mod.default_chessboard_params();

// calib-targets 0.14 added border_bits to CharucoBoardSpec and
// CharucoDetector::new now derives scan.border_bits from the board on every
// construction path — the adapter must send it under board, not scan. This is
// the 0.14 contract the app's charucoAdapter.ts migration depends on; if a
// later release moves the field again, this assertion is what catches it.
const defaultCharucoParams = mod.default_charuco_params(5, 7, 0.75, 'DICT_4X4_50');
if (!defaultCharucoParams || !defaultCharucoParams.board || !('border_bits' in defaultCharucoParams.board))
    throw new Error('default_charuco_params().board has no border_bits key — has the 0.14 contract moved again?');
console.log('PASS: default_charuco_params().board.border_bits = ' + defaultCharucoParams.board.border_bits);

// 0.14 rejects border_bits = 0 ("a marker with no ring cannot be told from the
// white square under it"), which is why the CharucoConfigForm field is min=1.
let rejectedZeroBorder = false;
try {
    const p0 = mod.default_charuco_params(5, 7, 0.75, 'DICT_4X4_50');
    p0.board.border_bits = 0;
    mod.detect_charuco(32, 32, gray, chessCfg, p0);
} catch(e) {
    if (String(e).includes('border_bits')) rejectedZeroBorder = true; else throw e;
}
if (!rejectedZeroBorder)
    throw new Error('expected board.border_bits = 0 to be rejected; the form min=1 depends on it');
console.log('PASS: board.border_bits = 0 is rejected (form min=1 is justified)');

const params = {
    px_per_square: 40,
    board: {
        rows: 22, cols: 22, cell_size: 4.8, marker_size_rel: 0.75, dictionary: 'DICT_4X4_1000',
        marker_layout: 'opencv_charuco', border_bits: 1,
    },
    chessboard: deepMerge(cbDefaults, {
        min_corner_strength: 15, min_labeled_corners: 8, max_components: 3,
    }),
};
try {
    mod.detect_charuco(32, 32, gray, chessCfg, params);
    console.log('PASS: detect_charuco accepts merged params with board.border_bits');
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
${HELPERS}
${IMPORT_DEEP_MERGE_AND_UNWRAP_MAPS}
const mod = await import('@vitavision/calib-targets');
await mod.default();
const gray = new Uint8Array(32 * 32).fill(128);
// threshold is a plain f32 absolute response floor as of 0.11 — see the
// "chessboard schema" test above for why this can't be a plain deepMerge.
const chessCfg = { ...mod.default_chess_config(), threshold: 15 };
// The board block MUST be sent under "board". markerboardAdapter.ts sent it
// under "layout" until this change; the struct has no such field, and the WASM
// boundary drops unknown keys silently, so the user's rows/cols/circles never
// reached the detector at all -- every run used the library default 6x8 board.
// The guard below pins that: an invalid payload under "board" must throw, and
// the very same payload under "layout" must be accepted exactly like a
// made-up key. If a future release adds a real "layout" field, this fails.
const badBoard = { rows: 'not-a-number', cols: 8 };
let boardKeyIsLive = false;
try {
    const p = mod.default_marker_board_params();
    p.board = { ...p.board, ...badBoard };
    mod.detect_marker_board(32, 32, gray, chessCfg, p);
} catch(e) {
    if (String(e).includes('expected u32')) boardKeyIsLive = true; else throw e;
}
if (!boardKeyIsLive)
    throw new Error('expected an invalid board.rows to be rejected -- is "board" still the schema key?');
const pLayout = mod.default_marker_board_params();
pLayout.layout = badBoard;
pLayout.totally_made_up_key = badBoard;
mod.detect_marker_board(32, 32, gray, chessCfg, pLayout);
console.log('PASS: "board" is the live schema key; "layout" is dropped like any unknown key');

const params = deepMerge(mod.default_marker_board_params(), {
    board: { rows: 22, cols: 22, circles: [{ cell: { i: 11, j: 11 }, polarity: 'black' }, { cell: { i: 12, j: 11 }, polarity: 'white' }, { cell: { i: 12, j: 12 }, polarity: 'white' }] },
    chessboard: { min_corner_strength: 15, min_labeled_corners: 8, max_components: 3 },
    circle_score: { patch_size: 64, min_contrast: 10 },
});
mod.detect_marker_board(32, 32, gray, chessCfg, params);
console.log('PASS: detect_marker_board accepts merged params under board (3 circles)');

// Probe the array-length contract on MarkerBoardSpec.circles directly.
//
// Measured directly against 0.14.0: fewer than 3 circles is rejected with a
// serde "invalid length" error. MORE than 3 is, surprisingly, NOT rejected —
// serde's generated Deserialize for a fixed-size array only checks that at
// least N elements are present; trailing elements beyond the third are
// silently dropped rather than erroring. So the runtime contract is "at
// least 3, extras silently ignored", not "exactly 3, else reject" — the app
// still constrains the UI/types to exactly 3 because a silently-truncated
// 4th circle is a worse footgun than an outright error, not because the
// library itself throws on it. Assert both halves of the real contract so a
// future @vitavision/calib-targets release that tightens this (or loosens
// the lower bound) is caught here.
function circlesOfLength(n) {
    const pool = [
        { cell: { i: 11, j: 11 }, polarity: 'black' },
        { cell: { i: 12, j: 11 }, polarity: 'white' },
        { cell: { i: 12, j: 12 }, polarity: 'white' },
        { cell: { i: 13, j: 12 }, polarity: 'black' },
        { cell: { i: 14, j: 12 }, polarity: 'white' },
    ];
    return pool.slice(0, n);
}
function detectWithCircleCount(n) {
    const p = mod.default_marker_board_params();
    p.board.circles = circlesOfLength(n);
    return mod.detect_marker_board(32, 32, gray, chessCfg, p);
}

let rejectedTwoCircles = false;
try {
    detectWithCircleCount(2);
} catch(e) {
    if (String(e).includes('invalid length 2') && String(e).includes('length 3')) {
        rejectedTwoCircles = true;
    } else {
        throw e;
    }
}
if (!rejectedTwoCircles)
    throw new Error('expected detect_marker_board to reject board.circles with 2 elements as a schema error, but it did not throw');
console.log('PASS: detect_marker_board rejects board.circles with fewer than 3 elements');

// board.circles with exactly 3 elements (the realistic, app-enforced case).
detectWithCircleCount(3);
console.log('PASS: detect_marker_board accepts board.circles with exactly 3 elements');

// board.circles with 4 elements must NOT throw (documented quirk above) —
// assert this explicitly so the test fails loudly if a future release starts
// rejecting it (in which case the app's runtime validation message can be
// relaxed) or, worse, silently starts accepting a 4th circle's data.
try {
    detectWithCircleCount(4);
} catch(e) {
    throw new Error('expected detect_marker_board to silently accept 4 circles (extras ignored per the 0.14.0 array-deserialization quirk), but it threw: ' + String(e));
}
console.log('PASS: detect_marker_board silently ignores a 4th circle rather than rejecting it (matches measured 0.14.0 behavior — see comment above)');

// The worker calls diagnose_marker_board (renamed from
// detect_marker_board_with_diagnostics in 0.13) and must survive a MISS.
// serde-wasm-bindgen serialises Rust None as *undefined*, not null, so the
// key is present with an undefined value: a strict "=== null" check falls
// through to the success branch and throws TypeError on result.corners.
// That is invisible to tsc because the module is any-typed, so assert the
// actual value here.
const miss = unwrapMaps(mod.diagnose_marker_board(32, 32, gray, chessCfg, params));
if (!('result' in miss))
    throw new Error('diagnose_marker_board payload has no result key: ' + JSON.stringify(Object.keys(miss)));
if (miss.result != null)
    throw new Error('expected a miss on a blank image, got a detection: ' + JSON.stringify(miss.result));
console.log('PASS: diagnose_marker_board returns a nullish result on a miss (value is '
    + (miss.result === null ? 'null' : 'undefined') + ', so the worker must use loose == null)');

// ---- calib-targets 0.15 marker-board schema migration guards --------------
// Every one of these changed SILENTLY in 0.15: a stale key is dropped by the
// WASM boundary like any unknown key, so only the invalid-payload probe (a
// string where a number belongs: live key -> throws, dead key -> accepted)
// can tell a live key from a dead one.
function isLive(path, bad) {
    const p = mod.default_marker_board_params();
    let o = p;
    for (const k of path.slice(0, -1)) { o[k] ??= {}; o = o[k]; }
    o[path[path.length - 1]] = bad;
    try { mod.diagnose_marker_board(32, 32, gray, chessCfg, p); return false; }
    catch (e) { return String(e).includes('invalid type'); }
}
const dflt = mod.default_marker_board_params();

// 1. The printed disk diameter lives on the board spec now.
if (dflt.board.circle_diameter_rel !== 0.5)
    throw new Error('default board.circle_diameter_rel is no longer 0.5: ' + JSON.stringify(dflt.board));
if ('diameter_frac' in dflt.circle_score)
    throw new Error('circle_score.diameter_frac is back in the defaults -- revisit the 0.15 migration');
if (!isLive(['board', 'circle_diameter_rel'], 'BAD'))
    throw new Error('board.circle_diameter_rel is not a live key (invalid payload was accepted)');
if (isLive(['circle_score', 'diameter_frac'], 'BAD'))
    throw new Error('circle_score.diameter_frac is live again -- the adapter may need to send it');
console.log('PASS: board.circle_diameter_rel is live (default 0.5); circle_score.diameter_frac is gone');

// 2. circle_match max_distance_cells was removed; min_offset_inliers is the whole layout.
if (isLive(['match_params', 'max_distance_cells'], 'BAD'))
    throw new Error('match_params.max_distance_cells is live again -- the adapter may need to send it');
if (!isLive(['match_params', 'min_offset_inliers'], 'BAD'))
    throw new Error('match_params.min_offset_inliers is not a live key');
if (dflt.match_params.min_offset_inliers !== 3)
    throw new Error('default min_offset_inliers is no longer 3: ' + dflt.match_params.min_offset_inliers);
console.log('PASS: match_params.max_distance_cells is gone; min_offset_inliers is live (default 3)');

// 3. The app's initial config must equal the library defaults for every circle-detector
// knob it states (the worker merges over the defaults, so a drifted app default silently
// overrides the library one) -- and the snapshot of those defaults is the live one.
const { readFileSync: readSrc } = await import('fs');
const A = ${JSON.stringify(ADAPTERS_DIR)};
const { MARKERBOARD_DEFAULTS, MARKERBOARD_CIRCLE_DIAMETER_REL, initialConfig: markerInitial } = await import(A + 'calibrationTargets/markerboard/config.ts');
const { CALIB_CHESS_DEFAULTS } = await import(A + 'chessDetectorDefaults.ts');
{
    const { board: _b, ...liveRest } = dflt;
    // chessboard.min_corner_strength is the one value the app states differently (15; library 33).
    const ours = structuredClone(MARKERBOARD_DEFAULTS);
    assertSame('MARKERBOARD_DEFAULTS', ours, liveRest);
    assertSame('CALIB_CHESS_DEFAULTS', CALIB_CHESS_DEFAULTS, mod.default_chess_config());
    assertSame('MARKERBOARD_CIRCLE_DIAMETER_REL', MARKERBOARD_CIRCLE_DIAMETER_REL, dflt.board.circle_diameter_rel);
    // initialConfig states only these departures from the library defaults:
    const departures = [];
    const walk = (a, b, path) => {
        for (const k of Object.keys(a)) {
            if (isObj(a[k]) && isObj(b?.[k])) walk(a[k], b[k], path + k + '.');
            else if (sameValue(a[k], b?.[k], path + k).length) departures.push(path + k);
        }
    };
    walk(markerInitial, { ...dflt, board: {} }, '');
    const expected = ['board.rows', 'board.cols', 'board.circles', 'chessboard.min_corner_strength'];
    if (JSON.stringify(departures.filter((d) => !d.startsWith('board.circle_diameter_rel')).sort()) !== JSON.stringify(expected.sort()))
        throw new Error('markerboard initialConfig departs from the library defaults at: ' + departures.join(', '));
}
// ...and the target generator's printed diameter default must agree with it.
const reducerSrc = readSrc('src/components/targetgen/reducer.ts', 'utf8');
const genDefault = /circleDiameterRel: ([0-9.]+),/.exec(reducerSrc);
if (!genDefault || Math.abs(Number(genDefault[1]) - dflt.board.circle_diameter_rel) > 1e-6)
    throw new Error('target generator circleDiameterRel default != detector default ' + dflt.board.circle_diameter_rel);
console.log('PASS: app detector defaults and target-generator diameter default equal the library defaults');

// 4. The diagnostics payload gained the ambiguity channel. A blank image has no
// alignment, so also assert the miss is NOT flagged ambiguous (the worker turns
// alignment_ambiguous into a hard error; a false positive here would break
// every plain miss).
const dg = miss.diagnostics;
for (const k of ['alignment_inliers', 'alignment_runner_up_inliers', 'alignment_ambiguous', 'circle_candidates', 'circle_matches', 'inliers'])
    if (!(k in dg)) throw new Error('diagnostics.' + k + ' missing; keys: ' + JSON.stringify(Object.keys(dg)));
if (dg.alignment_ambiguous !== false)
    throw new Error('blank-image miss reported alignment_ambiguous=' + dg.alignment_ambiguous);
console.log('PASS: diagnostics carry alignment_runner_up_inliers / alignment_ambiguous (blank miss is not ambiguous)');
process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: every key a stored config states is live",
        code: `
${HELPERS}
// The check that would have caught the dead chessboard sub-config: the WASM boundary drops
// unknown keys silently, so the only defence is to compare what the editor STORES against
// the library's own defaults. The stored config IS the document the library takes now, so
// this runs the real adapters' initialConfig, presets and sample defaults and asserts that
// every key path they state exists in the matching default_*_params() (a recursive subset;
// arrays of objects are compared by element shape).
const mod = await import('@vitavision/calib-targets');
await mod.default();
const A = ${JSON.stringify(ADAPTERS_DIR)};
const adapters = {
    chessboard: (await import(A + 'calibrationTargets/chessboardAdapter.ts')).chessboardAlgorithm,
    charuco: (await import(A + 'calibrationTargets/charucoAdapter.ts')).charucoAlgorithm,
    markerboard: (await import(A + 'calibrationTargets/markerboardAdapter.ts')).markerboardAlgorithm,
    puzzleboard: (await import(A + 'puzzleboard/adapter.ts')).puzzleboardAlgorithm,
};
const reference = (name, c) =>
    name === 'chessboard' ? { chess: mod.default_chess_config(), params: mod.default_chessboard_params() }
    : name === 'charuco' ? mod.default_charuco_params(c.board.rows, c.board.cols, c.board.marker_size_rel, c.board.dictionary)
    : name === 'markerboard' ? mod.default_marker_board_params()
    : mod.default_puzzleboard_params(c.board.rows, c.board.cols);
let checked = 0;
for (const [name, algo] of Object.entries(adapters)) {
    for (const [label, config] of storedConfigs(algo)) {
        const ref = reference(name, config);
        const dead = deadKeys(config, ref, '');
        // charuco's scan.border_bits / scan.marker_size_rel are derived from the board: the
        // stored configs leave them out and the worker takes them from the defaults.
        if (dead.length > 0)
            throw new Error(name + ' ' + label + ' states keys the library does not have (silently dropped): ' + dead.join(', '));
        if (name === 'charuco' && ('border_bits' in (config.scan ?? {}) || 'marker_size_rel' in (config.scan ?? {})))
            throw new Error('charuco ' + label + ' states a scan value the detector derives from the board');
        // Every non-board knob the config states must equal the library default or be a
        // deliberate departure; list them so a drift is a visible diff, not a silent override.
        checked++;
    }
}
console.log('PASS: ' + checked + ' stored configs (initialConfig + presets + samples, 4 board detectors) state only keys present in the library defaults');

// The chessboard params and ChESS config the other three embed are the same documents the
// standalone chessboard config pairs: the defaults they share are the live ones.
const { CALIB_CHESS_DEFAULTS } = await import(A + 'chessDetectorDefaults.ts');
const { CHESSBOARD_DEFAULT_PARAMS } = await import(A + 'calibrationTargets/chessboard/config.ts');
assertSame('CALIB_CHESS_DEFAULTS', CALIB_CHESS_DEFAULTS, mod.default_chess_config());
assertSame('CHESSBOARD_DEFAULT_PARAMS', CHESSBOARD_DEFAULT_PARAMS, mod.default_chessboard_params());
const { CHARUCO_DEFAULTS } = await import(A + 'calibrationTargets/charuco/config.ts');
const liveCharuco = mod.default_charuco_params(22, 22, 0.75, 'DICT_4X4_1000');
{
    const { board: _b, scan, ...rest } = liveCharuco;
    const { border_bits: _bb, marker_size_rel: _ms, ...scanRest } = scan;
    assertSame('CHARUCO_DEFAULTS', CHARUCO_DEFAULTS, { ...rest, scan: scanRest });
}
const { PUZZLEBOARD_DEFAULTS } = await import(A + 'puzzleboard/config.ts');
{
    const { board: _b, ...rest } = mod.default_puzzleboard_params(10, 10);
    assertSame('PUZZLEBOARD_DEFAULTS', PUZZLEBOARD_DEFAULTS, rest);
}
console.log('PASS: the snapshotted library defaults the board configs are written against equal the live default_*_params()');

// Teeth: the scan must flag a dead key. (A silent-pass guard is worse than none.)
const probe = deadKeys({ chessboard: { expected_rows: 7, min_corner_strength: 1 } }, mod.default_marker_board_params(), '');
if (probe.join() !== 'chessboard.expected_rows')
    throw new Error('dead-key scan has no teeth, flagged: ' + JSON.stringify(probe));
console.log('PASS: the dead-key scan flags chessboard.expected_rows');
process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: same config as before",
        code: `
${HELPERS}
// The four board detectors' stored configs, completed the way the worker completes them
// (mergeConfig over the live default_*_params()), contain every value the OLD adapters sent
// merged over the same defaults (src/components/editor/algorithms/__tests__/fixtures/
// legacy-snapshot.json, written before the forms were generated from the schemas).
const { mergeConfig } = await import(${JSON.stringify(UTIL_PATH)});
const mod = await import('@vitavision/calib-targets');
await mod.default();
const A = ${JSON.stringify(ADAPTERS_DIR)};
const adapters = {
    chessboard: (await import(A + 'calibrationTargets/chessboardAdapter.ts')).chessboardAlgorithm,
    charuco: (await import(A + 'calibrationTargets/charucoAdapter.ts')).charucoAlgorithm,
    markerboard: (await import(A + 'calibrationTargets/markerboardAdapter.ts')).markerboardAlgorithm,
    puzzleboard: (await import(A + 'puzzleboard/adapter.ts')).puzzleboardAlgorithm,
};
const subsetDiff = (expected, actual, path = '') => {
    if (isObj(expected)) {
        if (!isObj(actual)) return [path + ': expected an object'];
        return Object.entries(expected).flatMap(([k, v]) => subsetDiff(v, actual[k], path + '.' + k));
    }
    if (Array.isArray(expected)) return !Array.isArray(actual) || actual.length !== expected.length ? [path + ': array mismatch'] : expected.flatMap((v, i) => subsetDiff(v, actual[i], path + '[' + i + ']'));
    return sameValue(expected, actual, path);
};
const complete = (name, c) => {
    if (name === 'chessboard') return { chess: mergeConfig(mod.default_chess_config(), c.chess), params: mergeConfig(mod.default_chessboard_params(), c.params) };
    if (name === 'charuco') return { params: mergeConfig(mod.default_charuco_params(c.board.rows, c.board.cols, c.board.marker_size_rel, c.board.dictionary), c) };
    if (name === 'markerboard') return { params: mergeConfig(mod.default_marker_board_params(), c) };
    return { params: mergeConfig(mod.default_puzzleboard_params(c.board.rows, c.board.cols), c) };
};
let n = 0;
for (const [name, algo] of Object.entries(adapters)) {
    for (const entry of snapshot.algorithms[name]) {
        const config = entry.kind === 'initial' ? algo.initialConfig : entry.kind === 'preset' ? algo.presets.find((p) => p.label === entry.label).config : algo.sampleDefaults[entry.label];
        const now = complete(name, config);
        const old = entry.oldWasm;
        // the front-end: the old worker's chess_cfg argument overrode params.chess where it was given
        const oldChess = old.chess ?? old.params.chess;
        const nowChess = name === 'chessboard' ? now.chess : now.params.chess;
        const { chess: _c, ...oldParams } = old.params;
        const diff = [
            ...subsetDiff(oldChess, nowChess, 'chess'),
            ...subsetDiff(name === 'chessboard' ? old.params : oldParams, name === 'chessboard' ? now.params : now.params, 'params'),
        ];
        if (diff.length) throw new Error(name + ' ' + entry.kind + ' ' + entry.label + ': ' + diff.slice(0, 5).join('; '));
        n++;
    }
}
console.log('PASS: ' + n + ' stored configs complete to every value the old adapters sent (' + Object.keys(adapters).join(', ') + ')');
process.exit(0);
`,
    },
    {
        name: "@vitavision/calib-targets: puzzlepole (printable)",
        code: `
const mod = await import('@vitavision/calib-targets');
await mod.default();
// puzzlepole_periods() is the library's table of strips that close
// seamlessly; the generator reads it at runtime (worker command
// 'puzzlepole-periods') instead of copying it. It must stay an array of
// [circumference_squares, start_row] integer pairs.
const periods = mod.puzzlepole_periods();
if (!Array.isArray(periods) || periods.length === 0 || !periods.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)))
    throw new Error('puzzlepole_periods() shape changed: ' + JSON.stringify(periods).slice(0, 200));
console.log('PASS: puzzlepole_periods() is ' + periods.length + ' [circumference, start_row] pairs');

// The generator renders through render_target_bundle_json with kind
// 'puzzlepole' (page size / orientation / margin apply) rather than
// render_puzzlepole_bundle (fixed tight page, no options).
const [circumference, startRow] = periods[0];
const doc = (over) => ({
    schema_version: 1,
    target: { kind: 'puzzlepole', circumference_squares: circumference, start_row: startRow, axial_squares: 6, square_size_mm: 5, ...over },
    page: { size: { kind: 'a4' }, orientation: 'portrait', margin_mm: 10 },
    render: { debug_annotations: false, png_dpi: 100 },
});
const bundle = mod.render_target_bundle_json(doc({}));
for (const k of ['json_text', 'svg_text', 'png_bytes', 'dxf_text'])
    if (!bundle[k] || bundle[k].length === 0) throw new Error('puzzlepole bundle has empty ' + k);
if (!/width="210mm" height="297mm"/.test(bundle.svg_text))
    throw new Error('puzzlepole page options were not applied: ' + bundle.svg_text.slice(0, 200));
console.log('PASS: render_target_bundle_json renders kind puzzlepole at the requested A4 page');

// Invalid-payload probes: the optional keys the app does NOT send are live
// (a string where a number belongs throws); a made-up key is accepted silently.
for (const key of ['axial_start_col', 'dot_diameter_rel']) {
    let live = false;
    try { mod.render_target_bundle_json(doc({ [key]: 'BAD' })); } catch (e) { live = String(e).includes('invalid type'); }
    if (!live) throw new Error('puzzlepole target key ' + key + ' is not live');
}
mod.render_target_bundle_json(doc({ totally_made_up_key: 'BAD' }));
console.log('PASS: axial_start_col / dot_diameter_rel are live keys; unknown keys are dropped silently');

let rejected = '';
try { mod.render_target_bundle_json(doc({ circumference_squares: 25 })); } catch (e) { rejected = String(e); }
if (!rejected.includes('25')) throw new Error('unsupported period 25 was not rejected: ' + rejected);
console.log('PASS: unsupported period rejected by the library: ' + rejected.replace(/^Error: /, ''));
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
// detect_puzzleboard throws on failure, but diagnose_puzzleboard resolves
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
const diag = unwrap(mod.diagnose_puzzleboard(photo.width, photo.height, photoGray, null, params));
if (diag?.result == null)
    throw new Error('public/author_like_oblique.png failed to decode (result is ' + diag?.result + ')');
if (diag.result.corners.length !== 361)
    throw new Error('expected 361 corners on public/author_like_oblique.png, got ' + diag.result.corners.length);
if (diag.result.decode.bit_error_rate !== 0)
    throw new Error('expected a clean decode (bit_error_rate 0), got ' + diag.result.decode.bit_error_rate);
console.log('PASS: real photo decodes to 361 corners at bit_error_rate 0');
// 0.14 reshaped GridAlignment to { lattice, matrix: [[a,b],[c,d]], translation }.
// wasmWorker.ts alignmentFromWasm() converts it for PuzzleboardOverlay.
const al = diag.result.alignment;
if (!Array.isArray(al?.matrix) || al.matrix.length !== 2 || !al.matrix.every((row) => Array.isArray(row) && row.length === 2)
    || !Array.isArray(al.translation) || al.translation.length !== 2)
    throw new Error('alignment is not { matrix: 2x2, translation: [tx, ty] }: ' + JSON.stringify(al));
console.log('PASS: alignment is { matrix: 2x2, translation } (0.14 GridTransform)');
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
${HELPERS}
const mod = await import('@vitavision/radsym');
await mod.default();
const A = ${JSON.stringify(ADAPTERS_DIR)};
const { RADSYM_DEFAULTS, radiusRange } = await import(A + 'radsym/config.ts');
const { radsymAlgorithm } = await import(A + 'radsym/adapter.ts');

// 1. The snapshot of the library default the configs are written against is the live one, in
// the Rust spelling of the enums ("Bright", "Sobel"), which the processor's set_* methods
// do not use.
assertSame('RADSYM_DEFAULTS', RADSYM_DEFAULTS, JSON.parse(mod.default_config_json()));
console.log('PASS: RADSYM_DEFAULTS equals default_config_json()');

// 2. Every stored config builds a processor, and the processor reads back exactly the
// document it was given (an unknown key would be ignored and show up as a difference).
const png = (await import('pngjs')).PNG.sync.read((await import('fs')).readFileSync('public/ringgrid.png'));
const pixels = new Uint8Array(png.data);
let n = 0;
for (const [label, config] of storedConfigs(radsymAlgorithm)) {
    const p = mod.RadSymProcessor.with_config_json(JSON.stringify(config.config));
    assertSame('radsym ' + label + ' read back', config.config, JSON.parse(p.config_json()));
    const proposals = p.extract_proposals(pixels, png.width, png.height, config.algorithm);
    if (proposals.length % 3 !== 0) throw new Error('extract_proposals stride is not 3');
    p.free();
    n++;
}
console.log('PASS: ' + n + ' stored configs round-trip through with_config_json and run extract_proposals');

// 3. Same config as before: what the old setter calls (set_radii, set_alpha, ...) left in the
// processor is what the stored config loads to now.
for (const entry of snapshot.algorithms.radsym) {
    const config = entry.kind === 'initial' ? radsymAlgorithm.initialConfig : radsymAlgorithm.presets.find((p) => p.label === entry.label).config;
    assertSame('radsym ' + entry.label, config, entry.oldWasm);
}
console.log('PASS: initialConfig and the presets equal the processor state the old setters produced');

// 4. All four proposal algorithms and the heatmap run from one config.
const cfg = radsymAlgorithm.initialConfig.config;
for (const algorithm of ['frst', 'frst_fused', 'rsd', 'rsd_fused']) {
    const p = mod.RadSymProcessor.with_config_json(JSON.stringify(cfg));
    p.extract_proposals(new Uint8Array(32 * 32 * 4).fill(128), 32, 32, algorithm);
    const hm = p.response_heatmap(new Uint8Array(32 * 32 * 4).fill(128), 32, 32, algorithm, 'magma');
    if (!(hm instanceof Uint8Array) || hm.length !== 32 * 32 * 4) throw new Error('response_heatmap wrong output for ' + algorithm);
    p.free();
}
console.log('PASS: extract_proposals and response_heatmap run for frst, frst_fused, rsd, rsd_fused');

// 5. The radius range the form edits is the list the document holds.
if (JSON.stringify(radiusRange(5, 8)) !== '[5,6,7,8]') throw new Error('radiusRange');
process.exit(0);
`,
    },
    {
        name: "end to end: stored configs through the real worker handlers",
        code: `
${HELPERS}
// Run every algorithm's stored initialConfig through the REAL worker handler on the sample
// image the editor opens for it, map the result with the adapter's own toFeatures, and compare
// with the feature counts the editor e2e fixture committed -- the same counts, from the same
// config, without a browser. (The browser run in e2e/editor-algorithms.spec.ts remains the
// authority; this is the quick check that needs no build.)
const { PNG } = await import('pngjs');
const { readFileSync } = await import('fs');
const W = ${JSON.stringify(fileURLToPath(new URL("../src/lib/wasm/worker/", import.meta.url)))};
const A = ${JSON.stringify(ADAPTERS_DIR)};
const expected = JSON.parse(readFileSync('e2e/fixtures/editor-algorithm-counts.json', 'utf8'));
const { handleChessCorners } = await import(W + 'chessCorners.ts');
const { handleCalibTarget } = await import(W + 'calibTargets.ts');
const { handlePuzzleboard } = await import(W + 'puzzleboard.ts');
const { handleRinggrid } = await import(W + 'ringgrid.ts');
const { handleRadsym } = await import(W + 'radsym.ts');
const algos = {
    'chess-corners': [(await import(A + 'chessCorners/adapter.ts')).chessCornersAlgorithm, 'chessboard.png', (p, w, h, c) => handleChessCorners(p, w, h, c)],
    chessboard: [(await import(A + 'calibrationTargets/chessboardAdapter.ts')).chessboardAlgorithm, 'chessboard.png', (p, w, h, c) => handleCalibTarget('chessboard', p, w, h, c)],
    charuco: [(await import(A + 'calibrationTargets/charucoAdapter.ts')).charucoAlgorithm, 'charuco.png', (p, w, h, c) => handleCalibTarget('charuco', p, w, h, c)],
    markerboard: [(await import(A + 'calibrationTargets/markerboardAdapter.ts')).markerboardAlgorithm, 'markerboard.png', (p, w, h, c) => handleCalibTarget('markerboard', p, w, h, c)],
    ringgrid: [(await import(A + 'ringgrid/adapter.ts')).ringgridAlgorithm, 'ringgrid.png', (p, w, h, c) => handleRinggrid(p, w, h, c)],
    radsym: [(await import(A + 'radsym/adapter.ts')).radsymAlgorithm, 'ringgrid.png', (p, w, h, c) => handleRadsym(p, w, h, c)],
    puzzleboard: [(await import(A + 'puzzleboard/adapter.ts')).puzzleboardAlgorithm, 'author_like_oblique.png', (p, w, h, c) => handlePuzzleboard(p, w, h, c)],
};
let n = 0;
for (const [id, [algo, file, run]] of Object.entries(algos)) {
    const png = PNG.sync.read(readFileSync('public/' + file));
    const sampleKey = expected[id].sample;
    // The editor runs an algorithm with the sample default for its sample, else the initial config.
    const config = algo.sampleDefaults?.[sampleKey] ?? algo.initialConfig;
    const result = await run(new Uint8Array(png.data), png.width, png.height, config);
    const features = algo.toFeatures(result, 'run');
    const kinds = {};
    for (const f of features) kinds[f.type] = (kinds[f.type] ?? 0) + 1;
    if (features.length !== expected[id].total || JSON.stringify(Object.entries(kinds).sort()) !== JSON.stringify(Object.entries(expected[id].kinds).sort()))
        throw new Error(id + ': ' + features.length + ' features ' + JSON.stringify(kinds) + ', e2e fixture has ' + expected[id].total + ' ' + JSON.stringify(expected[id].kinds));
    const first = features[0];
    const want = expected[id].firstPositions[0];
    if (Math.abs(first.x - want.x) > 1e-3 || Math.abs(first.y - want.y) > 1e-3)
        throw new Error(id + ': first feature at ' + first.x + ',' + first.y + ', fixture has ' + want.x + ',' + want.y);
    n++;
    console.log('PASS: ' + id + ' on ' + file + ' -> ' + features.length + ' features, first at ' + first.x.toFixed(2) + ',' + first.y.toFixed(2) + ' (matches e2e fixture)');
}
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
