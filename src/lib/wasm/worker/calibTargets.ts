import { generateId, toPoint, toPointOrNull, toPointArray, toPointArrayOrNull, gridFromWasm, alignmentFromWasm, deepMerge, unwrapMaps, mapTargetBundle, type TargetBundle, type RawTargetBundle } from "./util";
import { getCalibModule } from "./modules";

export function adaptCalibTargetResult(
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
        // calib-targets 0.10.1 renamed the wire grid coordinate from
        // GridCoords{i,j} to Coord{u,v}; map it back onto the internal {i,j}
        // shape the rest of the app (overlays, feature meta) still uses.
        const grid = gridFromWasm(c.grid);
        return {
            id: generateId(),
            x: pos.x,
            y: pos.y,
            x_norm: pos.x / width,
            y_norm: pos.y / height,
            score: (c.score as number) ?? 0,
            grid,
            // 0.10.1 chessboard corners carry `input_index` instead of `id`/
            // `target_position`; charuco/markerboard corners still carry `id`.
            // Prefer input_index, then id, then fall back to array position.
            corner_id: (c.input_index as number) ?? (c.id as number) ?? idx,
            target_position: toPointOrNull(c.target_position),
        };
    });

    // Map markers for charuco — WASM returns corners as [[x,y], ...] arrays
    let markers = null;
    if (algorithm === "charuco" && r.markers) {
        const rawMarkers = r.markers as Array<Record<string, unknown>>;
        markers = rawMarkers.map((m) => {
            const gc = m.gc as { u: number; v: number };
            return {
                id: m.id as number,
                grid_cell: { gx: gc.u, gy: gc.v },
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
    const alignment = r.alignment ? alignmentFromWasm(r.alignment) : null;

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

export async function handleCalibTarget(
    algorithm: "chessboard" | "charuco" | "markerboard",
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getCalibModule();

    // Convert RGBA to grayscale
    const gray = mod.rgba_to_gray(pixels, width, height);

    // Start from WASM defaults and merge user overrides. `upscale` on
    // ChessConfig is an internally-tagged Rust enum (exactly one variant key)
    // — a plain deepMerge would union the default's variant key with the
    // override's, and the WASM deserializer rejects that ("invalid length 2,
    // expected 1"). Replace it wholesale when overridden instead of merging.
    //
    // `threshold` was such an enum in 0.10.1; 0.11 collapsed it to a plain f32
    // absolute response floor (default 15). It stays in the wholesale-replace
    // list because replacing a scalar is what deepMerge would do anyway, and
    // keeping both fields on the same path means a future re-tagging cannot
    // reintroduce the union bug silently.
    const chessCfg = config.chessCfg
        ? (() => {
            const overrides = config.chessCfg as Record<string, unknown>;
            const merged = deepMerge(mod.default_chess_config(), overrides);
            if (overrides.threshold !== undefined) merged.threshold = overrides.threshold;
            if (overrides.upscale !== undefined) merged.upscale = overrides.upscale;
            return merged;
        })()
        : undefined;

    const t0 = performance.now();
    let result: unknown;

    if (algorithm === "chessboard") {
        const defaults = mod.default_chessboard_params() as Record<string, unknown>;
        const userParams = (config.params ?? {}) as Record<string, unknown>;
        const params = deepMerge(defaults, userParams);
        const raw = mod.detect_chessboard(width, height, gray, chessCfg, params) as
            | { corners: unknown[]; cell_size: number | null }
            | null;
        // 0.10.1 flattened ChessboardDetectionResult to { corners, cell_size } —
        // the `target`/`detection` wrapper is gone entirely. Re-wrap into the
        // internal { detection: { kind, corners } } shape adaptCalibTargetResult
        // and the rest of the app expect. `cell_size` has no current consumer.
        result = raw ? { detection: { kind: "chessboard", corners: raw.corners } } : null;
    } else if (algorithm === "charuco") {
        // Charuco has no dedicated defaults function.
        // Its `chessboard` sub-object uses the same schema as standalone chessboard params —
        // merge user overrides on top of chessboard defaults for that section.
        const userParams = (config.params ?? {}) as Record<string, unknown>;
        const userChessboard = (userParams.chessboard ?? {}) as Record<string, unknown>;
        const chessboardDefaults = mod.default_chessboard_params() as Record<string, unknown>;
        const mergedChessboard = deepMerge(chessboardDefaults, userChessboard);
        const params = { ...userParams, chessboard: mergedChessboard };
        const raw = mod.detect_charuco(width, height, gray, chessCfg, params) as {
            corners: unknown[];
            markers: unknown[];
            alignment: unknown;
        };
        // 0.10.1 flattened CharucoDetectionResult to { corners, markers, alignment }.
        result = {
            detection: { kind: "charuco", corners: raw.corners },
            markers: raw.markers,
            alignment: raw.alignment,
        };
    } else {
        const defaults = mod.default_marker_board_params() as Record<string, unknown>;
        const userParams = (config.params ?? {}) as Record<string, unknown>;
        const params = deepMerge(defaults, userParams);
        // 0.10.1 flattened MarkerBoardDetectionResult to { corners, alignment } and
        // moved circle_candidates / circle_matches / alignment_inliers into the
        // diagnostics channel. Call the diagnose_* variant and deep-unwrap
        // its Map-based payload (see unwrapMaps) to keep those fields populated —
        // the overlay's circle-candidate/match rendering depends on them.
        const withDiag = unwrapMaps(
            mod.diagnose_marker_board(width, height, gray, chessCfg, params),
        ) as {
            result?: { corners: unknown[]; alignment: unknown } | null;
            diagnostics: { circle_candidates: unknown[]; circle_matches: unknown[]; alignment_inliers: number } | null;
        };
        // `== null`, not `=== null`: serde-wasm-bindgen serialises Rust `None` as
        // *undefined*, so the key is present with an undefined value and a strict
        // null check never matches. Verified against the real module — a failed
        // detection under a strict check reached `withDiag.result.corners` and
        // threw `TypeError: undefined is not an object`. The puzzleboard branch
        // (see worker/puzzleboard.ts) has always used the loose check for this
        // same reason.
        result = withDiag.result == null
            ? null
            : {
                detection: { kind: "checkerboard_marker", corners: withDiag.result.corners },
                alignment: withDiag.result.alignment,
                circle_candidates: withDiag.diagnostics?.circle_candidates ?? [],
                circle_matches: withDiag.diagnostics?.circle_matches ?? [],
                alignment_inliers: withDiag.diagnostics?.alignment_inliers ?? null,
            };
    }

    const runtimeMs = performance.now() - t0;

    return adaptCalibTargetResult(result, algorithm, width, height, runtimeMs);
}

/**
 * Render a `PrintableTargetDocument` (see
 * `src/components/targetgen/printableDocument.ts`) via the library's own
 * renderer, returning the full JSON/SVG/PNG/DXF bundle.
 *
 * `render_target_bundle_json` returns a `GeneratedTargetBundle` JS object
 * with fields `{ json_text, svg_text, png_bytes, dxf_text }` — verified
 * against the real WASM module (see `printableDocument.ts`'s header comment
 * for the verification method), not inferred from the `.d.ts`'s `any`
 * return type.
 */
export async function handleRenderTargetBundle(doc: unknown): Promise<TargetBundle> {
    const mod = await getCalibModule();
    const bundle = mod.render_target_bundle_json(doc) as RawTargetBundle;
    return mapTargetBundle(bundle);
}
