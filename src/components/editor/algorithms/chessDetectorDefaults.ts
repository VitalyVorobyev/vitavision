import type { ConfigDocument } from "./types";

/*
 * The library defaults of the ChESS corner front-end (`DetectorConfig`), snapshotted so the
 * configs below can be written as "the defaults, plus what the app changes" without loading
 * a WASM module. `scripts/test-wasm-schemas.ts` compares both against the live
 * `default_detector_config_json()` / `default_chess_config()`, so a library change that moves
 * a default fails there rather than being silently shadowed here.
 *
 * The two differ in one value: the standalone detector's absolute response floor is 30, the
 * one the board detectors run with is 15.
 */

const detectorConfig = (threshold: number): ConfigDocument => ({
    strategy: {
        chess: {
            ring: "canonical",
            refiner: {
                center_of_mass: { radius: 2 },
            },
        },
    },
    threshold,
    detection: { nms_radius: 2, min_cluster_size: 2 },
    multiscale: "single_scale",
    upscale: "disabled",
    orientation_method: "ring_fit",
    merge_radius: 3,
});

/** `default_detector_config_json()` of @vitavision/chess-corners. */
export const CHESS_CORNERS_DEFAULTS: ConfigDocument = detectorConfig(30);

/** `default_chess_config()` of @vitavision/calib-targets. */
export const CALIB_CHESS_DEFAULTS: ConfigDocument = detectorConfig(15);
