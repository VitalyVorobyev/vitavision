/**
 * Web Worker for running WASM-based CV algorithms off the main thread.
 *
 * Lazily loads WASM modules on first use. Accepts detection requests via
 * postMessage and returns results (or errors) with correlation IDs.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** UUID generation with fallback for non-secure contexts (HTTP via --host). */
function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type AlgorithmType =
    | "chess-corners"
    | "chessboard"
    | "charuco"
    | "markerboard"
    | "ringgrid"
    | "radsym"
    | "puzzleboard";

export type WorkerCommand = "detect" | "radsym-heatmap" | "puzzleboard-gen-png";

export interface WorkerRequest {
    id: number;
    command?: WorkerCommand;
    algorithm: AlgorithmType;
    pixels: Uint8Array;
    width: number;
    height: number;
    config: unknown;
}

export interface WorkerResponse {
    id: number;
    result?: unknown;
    error?: string;
}

// ── WASM module singletons ───────────────────────────────────────────────────

let chessInit: Promise<typeof import("chess-corners-wasm")> | null = null;
let calibInit: Promise<typeof import("calib-targets-wasm")> | null = null;
let puzzleInit: Promise<typeof import("@vitavision/calib-targets")> | null = null;

async function getChessModule() {
    if (!chessInit) {
        chessInit = import("chess-corners-wasm").then(async (mod) => {
            await mod.default();
            return mod;
        });
    }
    return chessInit;
}

async function getCalibModule() {
    if (!calibInit) {
        calibInit = import("calib-targets-wasm").then(async (mod) => {
            await mod.default();
            return mod;
        });
    }
    return calibInit;
}

// PuzzleBoard uses the newer @vitavision/calib-targets (0.7+) — its detector
// reliably finds the puzzleboard chessboard on real images, where the older
// calib-targets-wasm 0.6 fails ("chessboard not detected"). The two packages
// share most of the surface but diverge in puzzleboard internals and the
// `puzzleboard.chessboard` schema; the older package is kept for chessboard /
// charuco / markerboard whose adapters target the 0.6 schema.
async function getPuzzleboardModule() {
    if (!puzzleInit) {
        puzzleInit = import("@vitavision/calib-targets").then(async (mod) => {
            await mod.default();
            return mod;
        });
    }
    return puzzleInit;
}

let ringgridInit: Promise<typeof import("@vitavision/ringgrid")> | null = null;
let radsymInit: Promise<typeof import("@vitavision/radsym")> | null = null;

async function getRinggridModule() {
    if (!ringgridInit) {
        ringgridInit = import("@vitavision/ringgrid").then(async (mod) => {
            await mod.default();
            return mod;
        });
    }
    return ringgridInit;
}

async function getRadsymModule() {
    if (!radsymInit) {
        radsymInit = import("@vitavision/radsym").then(async (mod) => {
            await mod.default();
            return mod;
        });
    }
    return radsymInit;
}

// ── Result adapters ──────────────────────────────────────────────────────────

function adaptChessCornersResult(
    raw: Float32Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
    runtimeMs: number,
) {
    const stride = 9; // x, y, response, contrast, fit_rms, axis0_angle, axis0_sigma, axis1_angle, axis1_sigma
    if (raw.length % stride !== 0) {
        throw new Error(`chess-corners: unexpected output length ${raw.length} (expected multiple of ${stride})`);
    }
    const count = raw.length / stride;
    const corners = [];

    let responseMin = Infinity;
    let responseMax = -Infinity;
    let responseSum = 0;

    for (let i = 0; i < count; i++) {
        const x = raw[i * stride];
        const y = raw[i * stride + 1];
        const response = raw[i * stride + 2];
        const contrast = raw[i * stride + 3];
        const fit_rms = raw[i * stride + 4];
        const axis0_angle = raw[i * stride + 5];
        const axis0_sigma = raw[i * stride + 6];
        const axis1_angle = raw[i * stride + 7];
        const axis1_sigma = raw[i * stride + 8];

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(response)) continue;

        responseMin = Math.min(responseMin, response);
        responseMax = Math.max(responseMax, response);
        responseSum += response;

        corners.push({ x, y, response, contrast, fit_rms, axis0_angle, axis0_sigma, axis1_angle, axis1_sigma });
    }

    type AxisOut = { angle_rad: number; angle_deg: number; sigma_rad: number; direction: { dx: number; dy: number } };

    const makeAxis = (angle: number, sigma: number): AxisOut => ({
        angle_rad: angle,
        angle_deg: angle * 180 / Math.PI,
        sigma_rad: sigma,
        direction: { dx: Math.cos(angle), dy: Math.sin(angle) },
    });

    const range = responseMax - responseMin;
    const cornersOut = corners.map((c, idx) => {
        const confidence = range > 0 ? (c.response - responseMin) / range : 1.0;
        const confidenceLevel: "low" | "medium" | "high" =
            confidence < 0.33 ? "low" : confidence < 0.66 ? "medium" : "high";

        return {
            id: generateId(),
            x: c.x,
            y: c.y,
            x_norm: c.x / width,
            y_norm: c.y / height,
            response: c.response,
            contrast: c.contrast,
            fit_rms: c.fit_rms,
            axes: [makeAxis(c.axis0_angle, c.axis0_sigma), makeAxis(c.axis1_angle, c.axis1_sigma)] as [AxisOut, AxisOut],
            confidence,
            confidence_level: confidenceLevel,
            _index: idx,
        };
    });

    // Sort by confidence descending
    cornersOut.sort((a, b) => b.confidence - a.confidence);

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: width,
        image_height: height,
        frame: {
            name: "image_px_center" as const,
            origin: "top_left" as const,
            x_axis: "right" as const,
            y_axis: "down" as const,
            units: "pixels" as const,
        },
        config: {
            threshold_rel: (config.thresholdRel as number) ?? 0.2,
            nms_radius: (config.nmsRadius as number) ?? 2,
            broad_mode: (config.broadMode as boolean) ?? false,
            min_cluster_size: (config.minClusterSize as number) ?? 2,
            pyramid_levels: (config.pyramidLevels as number) ?? 4,
            pyramid_min_size: (config.pyramidMinSize as number) ?? 128,
            upscale_factor: (config.upscaleFactor as number) ?? 0,
            refiner: (config.refiner as string) ?? "center_of_mass",
        },
        summary: {
            count: cornersOut.length,
            response_min: cornersOut.length > 0 ? responseMin : null,
            response_max: cornersOut.length > 0 ? responseMax : null,
            response_mean: cornersOut.length > 0 ? responseSum / cornersOut.length : null,
            confidence_min: cornersOut.length > 0 ? cornersOut[cornersOut.length - 1].confidence : null,
            confidence_max: cornersOut.length > 0 ? cornersOut[0].confidence : null,
            runtime_ms: runtimeMs,
        },
        corners: cornersOut.map(({ _index: _, ...rest }) => rest),
    };
}

/** Convert WASM point (which may be [x,y] array or {x,y} object) to {x,y}. */
function toPoint(v: unknown): { x: number; y: number } {
    if (Array.isArray(v)) return { x: v[0] as number, y: v[1] as number };
    return v as { x: number; y: number };
}

function toPointOrNull(v: unknown): { x: number; y: number } | null {
    if (v == null) return null;
    return toPoint(v);
}

function toPointArray(v: unknown): Array<{ x: number; y: number }> {
    const arr = v as Array<unknown>;
    return arr.map(toPoint);
}

function toPointArrayOrNull(v: unknown): Array<{ x: number; y: number }> | null {
    if (v == null) return null;
    return toPointArray(v);
}

function adaptCalibTargetResult(
    raw: unknown,
    algorithm: "chessboard" | "charuco" | "markerboard",
    width: number,
    height: number,
    runtimeMs: number,
) {
    if (raw === null || raw === undefined) {
        // No detection - return empty result
        const kind = algorithm === "markerboard" ? "checkerboard_marker" : algorithm;
        return {
            status: "success" as const,
            key: "wasm://local",
            storage_mode: "local" as const,
            algorithm,
            image_width: width,
            image_height: height,
            frame: {
                name: "image_px_center" as const,
                origin: "top_left" as const,
                x_axis: "right" as const,
                y_axis: "down" as const,
                units: "pixels" as const,
            },
            summary: {
                corner_count: 0,
                marker_count: null,
                circle_candidate_count: null,
                circle_match_count: null,
                alignment_inliers: null,
                runtime_ms: runtimeMs,
            },
            detection: { kind, corners: [] },
            markers: null,
            alignment: null,
            circle_candidates: null,
            circle_matches: null,
        };
    }

    const r = raw as Record<string, unknown>;
    const detection = r.detection as { kind: string; corners: Array<Record<string, unknown>> };
    const kind = detection.kind;

    // Map LabeledCorner { position: [x, y], grid, id, target_position, score }
    // to CalibrationCorner { id, x, y, x_norm, y_norm, score, grid, corner_id, target_position }
    const corners = detection.corners.map((c, idx) => {
        const pos = toPoint(c.position);
        const grid = c.grid as { i: number; j: number } | null;
        return {
            id: generateId(),
            x: pos.x,
            y: pos.y,
            x_norm: pos.x / width,
            y_norm: pos.y / height,
            score: (c.score as number) ?? 0,
            grid: grid ?? null,
            corner_id: (c.id as number) ?? idx,
            target_position: toPointOrNull(c.target_position),
        };
    });

    // Map markers for charuco — WASM returns corners as [[x,y], ...] arrays
    let markers = null;
    if (algorithm === "charuco" && r.markers) {
        const rawMarkers = r.markers as Array<Record<string, unknown>>;
        markers = rawMarkers.map((m) => {
            const gc = m.gc as { i: number; j: number };
            return {
                id: m.id as number,
                grid_cell: { gx: gc.i, gy: gc.j },
                rotation: m.rotation as number,
                hamming: m.hamming as number,
                score: m.score as number,
                border_score: m.border_score as number,
                code: m.code as number,
                inverted: m.inverted as boolean,
                corners_rect: toPointArray(m.corners_rect),
                corners_img: toPointArrayOrNull(m.corners_img),
            };
        });
    }

    // Map circle data for markerboard
    let circleCandidates = null;
    let circleMatches = null;
    let alignmentInliers = null;
    if (algorithm === "markerboard") {
        if (r.circle_candidates) {
            circleCandidates = (r.circle_candidates as Array<Record<string, unknown>>).map((cc) => ({
                center_img: toPoint(cc.center_img),
                cell: cc.cell as { i: number; j: number },
                polarity: cc.polarity as "white" | "black",
                score: cc.score as number,
                contrast: cc.contrast as number,
            }));
        }
        if (r.circle_matches) {
            circleMatches = (r.circle_matches as Array<Record<string, unknown>>).map((cm) => ({
                expected: cm.expected as { cell: { i: number; j: number }; polarity: "white" | "black" },
                matched_index: (cm.matched_index as number) ?? null,
                distance_cells: (cm.distance_cells as number) ?? null,
                offset_cells: (cm.offset_cells as { di: number; dj: number }) ?? null,
            }));
        }
        alignmentInliers = (r.alignment_inliers as number) ?? null;
    }

    // Alignment (charuco and markerboard)
    let alignment = null;
    if (r.alignment) {
        const a = r.alignment as { transform: Record<string, number>; translation: number[] };
        alignment = {
            transform: a.transform,
            translation: a.translation,
        };
    }

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        algorithm,
        image_width: width,
        image_height: height,
        frame: {
            name: "image_px_center" as const,
            origin: "top_left" as const,
            x_axis: "right" as const,
            y_axis: "down" as const,
            units: "pixels" as const,
        },
        summary: {
            corner_count: corners.length,
            marker_count: markers ? markers.length : null,
            circle_candidate_count: circleCandidates ? circleCandidates.length : null,
            circle_match_count: circleMatches ? circleMatches.filter((m) => m.matched_index !== null).length : null,
            alignment_inliers: alignmentInliers,
            runtime_ms: runtimeMs,
        },
        detection: { kind, corners },
        markers,
        alignment,
        circle_candidates: circleCandidates,
        circle_matches: circleMatches,
    };
}

function adaptRinggridResult(
    jsonStr: string,
    width: number,
    height: number,
    runtimeMs: number,
) {
    const raw = JSON.parse(jsonStr);
    const detectedMarkers = raw.detected_markers as Array<Record<string, unknown>> ?? [];

    const markers = detectedMarkers.map((m) => {
        const center = m.center as number[];
        const ellipseOuter = m.ellipse_outer as Record<string, number>;
        const ellipseInner = m.ellipse_inner as Record<string, number> | undefined;
        const decode = m.decode as Record<string, unknown> | null;
        const fit = m.fit as Record<string, unknown> | null;
        const boardXy = m.board_xy_mm as number[] | null;

        return {
            id: decode ? (decode.best_id as number) : 0,
            confidence: (m.confidence as number) ?? 0,
            center: { x: center[0], y: center[1] },
            ellipse_outer: {
                cx: ellipseOuter.cx,
                cy: ellipseOuter.cy,
                a: ellipseOuter.a,
                b: ellipseOuter.b,
                angle: ellipseOuter.angle,
            },
            ellipse_inner: ellipseInner ? {
                cx: ellipseInner.cx,
                cy: ellipseInner.cy,
                a: ellipseInner.a,
                b: ellipseInner.b,
                angle: ellipseInner.angle,
            } : { cx: center[0], cy: center[1], a: 0, b: 0, angle: 0 },
            decode: decode ? {
                best_id: decode.best_id as number,
                best_rotation: decode.best_rotation as number,
                best_dist: decode.best_dist as number,
                margin: decode.margin as number,
                decode_confidence: decode.confidence as number,
            } : null,
            fit: fit ? {
                rms_residual_outer: (fit.rms_residual_outer as number) ?? null,
                rms_residual_inner: (fit.rms_residual_inner as number) ?? null,
                ransac_inlier_ratio_outer: (fit.ransac_inlier_ratio_outer as number) ?? null,
                ransac_inlier_ratio_inner: (fit.ransac_inlier_ratio_inner as number) ?? null,
            } : null,
            board_xy_mm: boardXy ? { x: boardXy[0], y: boardXy[1] } : null,
        };
    });

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: width,
        image_height: height,
        summary: {
            marker_count: markers.length,
            runtime_ms: runtimeMs,
        },
        markers,
    };
}

/** Adapt extract_proposals output (stride 3: x, y, score) to RadsymResult. */
function adaptRadsymProposalResult(
    raw: Float32Array,
    width: number,
    height: number,
    runtimeMs: number,
) {
    const stride = 3;
    const count = raw.length / stride;
    const circles = [];

    for (let i = 0; i < count; i++) {
        const x = raw[i * stride];
        const y = raw[i * stride + 1];
        const score = raw[i * stride + 2];

        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

        circles.push({
            id: generateId(),
            x,
            y,
            radius: 0,
            score,
        });
    }

    circles.sort((a, b) => b.score - a.score);

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: width,
        image_height: height,
        frame: {
            name: "image_px_center" as const,
            origin: "top_left" as const,
            x_axis: "right" as const,
            y_axis: "down" as const,
            units: "pixels" as const,
        },
        summary: {
            count: circles.length,
            runtime_ms: runtimeMs,
        },
        circles,
    };
}

// ── Detection handlers ───────────────────────────────────────────────────────

async function handleRinggrid(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getRinggridModule();

    // Start from WASM defaults, override with user-provided fields
    const defaults = JSON.parse(mod.default_board_json()) as Record<string, unknown>;
    const userBoard = config.boardJson
        ? JSON.parse(config.boardJson as string) as Record<string, unknown>
        : {};
    const merged = { ...defaults, ...userBoard };
    const boardJson = JSON.stringify(merged);

    const detector = new mod.RinggridDetector(boardJson);
    try {
        if (config.configOverlay) {
            detector.update_config(config.configOverlay as string);
        }

        const t0 = performance.now();
        const resultJson = detector.detect_adaptive_rgba(pixels, width, height);
        const runtimeMs = performance.now() - t0;

        return adaptRinggridResult(resultJson, width, height, runtimeMs);
    } finally {
        detector.free();
    }
}

async function handleRadsym(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getRadsymModule();
    const processor = new mod.RadSymProcessor();
    try {
        // Apply config
        if (config.radii) processor.set_radii(config.radii as Uint32Array);
        if (config.alpha != null) processor.set_alpha(config.alpha as number);
        if (config.gradientThreshold != null) processor.set_gradient_threshold(config.gradientThreshold as number);
        if (config.smoothingFactor != null) processor.set_smoothing_factor(config.smoothingFactor as number);
        if (config.nmsRadius != null) processor.set_nms_radius(config.nmsRadius as number);
        if (config.nmsThreshold != null) processor.set_nms_threshold(config.nmsThreshold as number);
        if (config.maxDetections != null) processor.set_max_detections(config.maxDetections as number);
        if (config.polarity) processor.set_polarity(config.polarity as string);
        if (config.radiusHint != null) processor.set_radius_hint(config.radiusHint as number);
        if (config.minScore != null) processor.set_min_score(config.minScore as number);
        if (config.gradientOperator) processor.set_gradient_operator(config.gradientOperator as string);

        const algorithm = (config.algorithm as string) ?? "frst";

        const t0 = performance.now();
        const result = processor.extract_proposals(pixels, width, height, algorithm);
        const runtimeMs = performance.now() - t0;

        return adaptRadsymProposalResult(result, width, height, runtimeMs);
    } finally {
        processor.free();
    }
}

async function handleRadsymHeatmap(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
    const mod = await getRadsymModule();
    const processor = new mod.RadSymProcessor();
    try {
        // Apply config (same as detection)
        if (config.radii) processor.set_radii(config.radii as Uint32Array);
        if (config.alpha != null) processor.set_alpha(config.alpha as number);
        if (config.gradientThreshold != null) processor.set_gradient_threshold(config.gradientThreshold as number);
        if (config.smoothingFactor != null) processor.set_smoothing_factor(config.smoothingFactor as number);
        if (config.polarity) processor.set_polarity(config.polarity as string);
        if (config.gradientOperator) processor.set_gradient_operator(config.gradientOperator as string);

        const algorithm = (config.algorithm as string) ?? "frst";
        const colormap = (config.colormap as string) ?? "magma";
        const rgba = processor.response_heatmap(pixels, width, height, algorithm, colormap);

        return { rgba, width, height };
    } finally {
        processor.free();
    }
}

async function handleChessCorners(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getChessModule();
    const detector = mod.ChessDetector.multiscale();

    try {
        if (typeof config.thresholdRel === "number") detector.set_threshold(config.thresholdRel);
        if (typeof config.nmsRadius === "number") detector.set_nms_radius(config.nmsRadius);
        if (typeof config.broadMode === "boolean") detector.set_broad_mode(config.broadMode);
        if (typeof config.minClusterSize === "number") detector.set_min_cluster_size(config.minClusterSize);
        if (typeof config.pyramidLevels === "number") {
            try {
                detector.set_pyramid_levels(config.pyramidLevels);
            } catch (e) {
                throw new Error(`chess-corners config: set_pyramid_levels(${config.pyramidLevels}) failed`, { cause: e });
            }
        }
        if (typeof config.pyramidMinSize === "number") detector.set_pyramid_min_size(config.pyramidMinSize);
        if (typeof config.upscaleFactor === "number") {
            try {
                detector.set_upscale_factor(config.upscaleFactor);
            } catch (e) {
                throw new Error(`chess-corners config: set_upscale_factor(${config.upscaleFactor}) failed`, { cause: e });
            }
        }
        if (typeof config.refiner === "string") {
            try {
                detector.set_refiner(config.refiner);
            } catch (e) {
                throw new Error(`chess-corners config: set_refiner("${config.refiner}") failed`, { cause: e });
            }
        }

        const t0 = performance.now();
        const result = detector.detect_rgba(pixels, width, height);
        const runtimeMs = performance.now() - t0;

        return adaptChessCornersResult(result, width, height, config, runtimeMs);
    } finally {
        detector.free();
    }
}

/**
 * Deep-merge source into target, overwriting only leaf values present in source.
 * Arrays are replaced entirely (not merged element-wise).
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const out = { ...target };
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

async function handleCalibTarget(
    algorithm: "chessboard" | "charuco" | "markerboard",
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getCalibModule();

    // Convert RGBA to grayscale
    const gray = mod.rgba_to_gray(pixels, width, height);

    // Start from WASM defaults and merge user overrides
    const chessCfg = config.chessCfg
        ? deepMerge(mod.default_chess_config(), config.chessCfg as Record<string, unknown>)
        : undefined;

    const t0 = performance.now();
    let result: unknown;

    if (algorithm === "chessboard") {
        const defaults = mod.default_chessboard_params() as Record<string, unknown>;
        const userParams = (config.params ?? {}) as Record<string, unknown>;
        const params = deepMerge(defaults, userParams);
        result = mod.detect_chessboard(width, height, gray, chessCfg, params);
    } else if (algorithm === "charuco") {
        // Charuco has no dedicated defaults function.
        // Its `chessboard` sub-object uses the same schema as standalone chessboard params —
        // merge user overrides on top of chessboard defaults for that section.
        const userParams = (config.params ?? {}) as Record<string, unknown>;
        const userChessboard = (userParams.chessboard ?? {}) as Record<string, unknown>;
        const chessboardDefaults = mod.default_chessboard_params() as Record<string, unknown>;
        const mergedChessboard = deepMerge(chessboardDefaults, userChessboard);
        const params = { ...userParams, chessboard: mergedChessboard };
        result = mod.detect_charuco(width, height, gray, chessCfg, params);
    } else {
        const defaults = mod.default_marker_board_params() as Record<string, unknown>;
        const userParams = (config.params ?? {}) as Record<string, unknown>;
        const params = deepMerge(defaults, userParams);
        result = mod.detect_marker_board(width, height, gray, chessCfg, params);
    }

    const runtimeMs = performance.now() - t0;

    return adaptCalibTargetResult(result, algorithm, width, height, runtimeMs);
}

function adaptPuzzleboardResult(
    raw: unknown,
    runtimeMs: number,
    width: number,
    height: number,
    _config: unknown,
) {
    if (raw === null || raw === undefined) {
        return {
            status: "success" as const,
            key: "wasm://local",
            storage_mode: "local" as const,
            image_width: width,
            image_height: height,
            frame: {
                name: "image_px_center" as const,
                origin: "top_left" as const,
                x_axis: "right" as const,
                y_axis: "down" as const,
                units: "pixels" as const,
            },
            summary: {
                corner_count: 0,
                mean_confidence: 0,
                bit_error_rate: 0,
                master_origin: [0, 0] as [number, number],
                runtime_ms: runtimeMs,
            },
            detection: { kind: "puzzleboard" as const, corners: [] },
            alignment: { transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] as [number, number] },
            decode: { edges_observed: 0, edges_matched: 0, mean_confidence: 0, bit_error_rate: 0, master_origin_row: 0, master_origin_col: 0 },
            observed_edges: [],
        };
    }

    const r = raw as Record<string, unknown>;
    const detection = r.detection as { kind: string; corners: Array<Record<string, unknown>> };
    const decodeRaw = r.decode as Record<string, unknown>;
    const alignmentRaw = r.alignment as { transform: Record<string, number>; translation: number[] } | null;
    const observedEdgesRaw = (r.observed_edges as Array<Record<string, unknown>>) ?? [];

    const corners = detection.corners.map((c) => {
        const pos = toPoint(c.position);
        const grid = c.grid as { i: number; j: number } | null;
        const tp = toPointOrNull(c.target_position);
        return {
            id: generateId(),
            // +0.5: corner detector uses pixel-center coords; canvas expects pixel-corner coords
            x: pos.x + 0.5,
            y: pos.y + 0.5,
            score: (c.score as number) ?? 0,
            grid: grid ?? null,
            master_id: (c.id as number) ?? null,
            target_position: tp ? { x: tp.x, y: tp.y } : null,
        };
    });

    const alignment = alignmentRaw
        ? { transform: alignmentRaw.transform as { a: number; b: number; c: number; d: number }, translation: alignmentRaw.translation as [number, number] }
        : { transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] as [number, number] };

    const decode = {
        edges_observed: (decodeRaw?.edges_observed as number) ?? 0,
        edges_matched: (decodeRaw?.edges_matched as number) ?? 0,
        mean_confidence: (decodeRaw?.mean_confidence as number) ?? 0,
        bit_error_rate: (decodeRaw?.bit_error_rate as number) ?? 0,
        master_origin_row: (decodeRaw?.master_origin_row as number) ?? 0,
        master_origin_col: (decodeRaw?.master_origin_col as number) ?? 0,
    };

    const observedEdges = observedEdgesRaw.map((e) => ({
        row: e.row as number,
        col: e.col as number,
        orientation: e.orientation as "horizontal" | "vertical",
        bit: e.bit as 0 | 1,
        confidence: e.confidence as number,
    }));

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: width,
        image_height: height,
        frame: {
            name: "image_px_center" as const,
            origin: "top_left" as const,
            x_axis: "right" as const,
            y_axis: "down" as const,
            units: "pixels" as const,
        },
        summary: {
            corner_count: corners.length,
            mean_confidence: decode.mean_confidence,
            bit_error_rate: decode.bit_error_rate,
            master_origin: [decode.master_origin_row, decode.master_origin_col] as [number, number],
            runtime_ms: runtimeMs,
        },
        detection: { kind: "puzzleboard" as const, corners },
        alignment,
        decode,
        observed_edges: observedEdges,
    };
}

async function handlePuzzleboard(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getPuzzleboardModule();

    const gray = mod.rgba_to_gray(pixels, width, height);

    // Read board dimensions for defaults
    const board = (config.board ?? {}) as Record<string, unknown>;
    const rows = (board.rows as number) ?? 10;
    const cols = (board.cols as number) ?? 10;

    const defaults = mod.default_puzzleboard_params(rows, cols) as Record<string, unknown>;
    const merged = deepMerge(defaults, config);

    const t0 = performance.now();
    const result = mod.detect_puzzleboard(width, height, gray, null, merged);
    const runtimeMs = performance.now() - t0;

    return adaptPuzzleboardResult(result, runtimeMs, width, height, merged);
}

async function handlePuzzleboardGenPng(
    rows: number,
    cols: number,
    cellSizeMm: number,
    dpi: number,
): Promise<{ png: Uint8Array; mimeType: string }> {
    const mod = await getPuzzleboardModule();
    const png = mod.render_puzzleboard_png(rows, cols, cellSizeMm, dpi);
    return { png, mimeType: "image/png" };
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const { id, command, algorithm, pixels, width, height, config } = event.data;
    const typedConfig = config as Record<string, unknown>;

    try {
        let result: unknown;

        if ((command ?? "detect") === "radsym-heatmap") {
            const heatmap = await handleRadsymHeatmap(pixels, width, height, typedConfig);
            (self as unknown as Worker).postMessage(
                { id, result: heatmap } satisfies WorkerResponse,
                [heatmap.rgba.buffer],
            );
            return;
        }

        if (command === "puzzleboard-gen-png") {
            const rows = (typedConfig.rows as number) ?? 7;
            const cols = (typedConfig.cols as number) ?? 10;
            const cellSizeMm = (typedConfig.cellSizeMm as number) ?? 15;
            const dpi = (typedConfig.pngDpi as number) ?? 300;
            const genResult = await handlePuzzleboardGenPng(rows, cols, cellSizeMm, dpi);
            (self as unknown as Worker).postMessage(
                { id, result: genResult } satisfies WorkerResponse,
                [genResult.png.buffer],
            );
            return;
        }

        if (algorithm === "chess-corners") {
            result = await handleChessCorners(pixels, width, height, typedConfig);
        } else if (algorithm === "ringgrid") {
            result = await handleRinggrid(pixels, width, height, typedConfig);
        } else if (algorithm === "radsym") {
            result = await handleRadsym(pixels, width, height, typedConfig);
        } else if (algorithm === "puzzleboard") {
            result = await handlePuzzleboard(pixels, width, height, typedConfig);
        } else {
            result = await handleCalibTarget(algorithm, pixels, width, height, typedConfig);
        }

        (self as unknown as Worker).postMessage({ id, result } satisfies WorkerResponse);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        (self as unknown as Worker).postMessage({ id, error: message } satisfies WorkerResponse);
    }
};
