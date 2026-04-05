/**
 * Web Worker for running WASM-based CV algorithms off the main thread.
 *
 * Lazily loads WASM modules on first use. Accepts detection requests via
 * postMessage and returns results (or errors) with correlation IDs.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AlgorithmType =
    | "chess-corners"
    | "chessboard"
    | "charuco"
    | "markerboard";

export interface WorkerRequest {
    id: number;
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

// ── Result adapters ──────────────────────────────────────────────────────────

function adaptChessCornersResult(
    raw: Float32Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
    runtimeMs: number,
) {
    const stride = 4; // x, y, response, orientation
    const count = raw.length / stride;
    const corners = [];

    let responseMin = Infinity;
    let responseMax = -Infinity;
    let responseSum = 0;

    for (let i = 0; i < count; i++) {
        const x = raw[i * stride];
        const y = raw[i * stride + 1];
        const response = raw[i * stride + 2];
        const orientation = raw[i * stride + 3];

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(response)) continue;

        responseMin = Math.min(responseMin, response);
        responseMax = Math.max(responseMax, response);
        responseSum += response;

        corners.push({ x, y, response, orientation });
    }

    // Compute confidence from response range (same logic as backend)
    const range = responseMax - responseMin;
    const cornersOut = corners.map((c, idx) => {
        const confidence = range > 0 ? (c.response - responseMin) / range : 1.0;
        const confidenceLevel: "low" | "medium" | "high" =
            confidence < 0.33 ? "low" : confidence < 0.66 ? "medium" : "high";
        const id = crypto.randomUUID();

        return {
            id,
            x: c.x,
            y: c.y,
            x_norm: c.x / width,
            y_norm: c.y / height,
            response: c.response,
            orientation_rad: c.orientation,
            orientation_deg: (c.orientation * 180) / Math.PI,
            direction: {
                dx: Math.cos(c.orientation),
                dy: Math.sin(c.orientation),
            },
            confidence,
            confidence_level: confidenceLevel,
            subpixel_offset_px: 0, // Not available from WASM
            _index: idx, // for sorting
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
            use_ml_refiner: false,
            threshold_rel: (config.thresholdRel as number) ?? null,
            threshold_abs: null,
            nms_radius: 2,
            min_cluster_size: 2,
            pyramid_num_levels: 4,
            pyramid_min_size: 128,
            refinement_radius: 4,
            merge_radius: 4.0,
            use_radius10: false,
            descriptor_use_radius10: null,
            refiner: "center_of_mass",
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

    // Map LabeledCorner { position: {x, y}, grid, id, target_position, score }
    // to CalibrationCorner { id, x, y, x_norm, y_norm, score, grid, corner_id, target_position }
    const corners = detection.corners.map((c, idx) => {
        const pos = c.position as { x: number; y: number };
        const grid = c.grid as { i: number; j: number } | null;
        const targetPos = c.target_position as { x: number; y: number } | null;
        return {
            id: crypto.randomUUID(),
            x: pos.x,
            y: pos.y,
            x_norm: pos.x / width,
            y_norm: pos.y / height,
            score: (c.score as number) ?? 0,
            grid: grid ?? null,
            corner_id: (c.id as number) ?? idx,
            target_position: targetPos ?? null,
        };
    });

    // Map markers for charuco
    let markers = null;
    if (algorithm === "charuco" && r.markers) {
        const rawMarkers = r.markers as Array<Record<string, unknown>>;
        markers = rawMarkers.map((m) => {
            const gc = m.gc as { i: number; j: number };
            const cornersRect = m.corners_rect as Array<{ x: number; y: number }>;
            const cornersImg = m.corners_img as Array<{ x: number; y: number }> | null;
            return {
                id: m.id as number,
                grid_cell: { gx: gc.i, gy: gc.j },
                rotation: m.rotation as number,
                hamming: m.hamming as number,
                score: m.score as number,
                border_score: m.border_score as number,
                code: m.code as number,
                inverted: m.inverted as boolean,
                corners_rect: cornersRect,
                corners_img: cornersImg,
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
                center_img: cc.center_img as { x: number; y: number },
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

// ── Detection handlers ───────────────────────────────────────────────────────

async function handleChessCorners(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getChessModule();
    const detector = mod.ChessDetector.multiscale();

    if (config.thresholdRel != null) {
        detector.set_threshold(config.thresholdRel as number);
    }

    const t0 = performance.now();
    const result = detector.detect_rgba(pixels, width, height);
    const runtimeMs = performance.now() - t0;

    detector.free();

    return adaptChessCornersResult(result, width, height, config, runtimeMs);
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

    // Build chess config override
    const chessCfg = config.chessCfg ?? undefined;

    const t0 = performance.now();
    let result: unknown;

    if (algorithm === "chessboard") {
        const params = config.params ?? mod.default_chessboard_params();
        result = mod.detect_chessboard(width, height, gray, chessCfg, params);
    } else if (algorithm === "charuco") {
        result = mod.detect_charuco(width, height, gray, chessCfg, config.params);
    } else {
        const params = config.params ?? mod.default_marker_board_params();
        result = mod.detect_marker_board(width, height, gray, chessCfg, params);
    }

    const runtimeMs = performance.now() - t0;

    return adaptCalibTargetResult(result, algorithm, width, height, runtimeMs);
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const { id, algorithm, pixels, width, height, config } = event.data;
    const typedConfig = config as Record<string, unknown>;

    try {
        let result: unknown;

        if (algorithm === "chess-corners") {
            result = await handleChessCorners(pixels, width, height, typedConfig);
        } else {
            result = await handleCalibTarget(algorithm, pixels, width, height, typedConfig);
        }

        (self as unknown as Worker).postMessage({ id, result } satisfies WorkerResponse);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        (self as unknown as Worker).postMessage({ id, error: message } satisfies WorkerResponse);
    }
};
