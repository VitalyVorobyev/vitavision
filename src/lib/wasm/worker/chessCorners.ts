import { generateId } from "./util";
import { getChessModule } from "./modules";

export function adaptChessCornersResult(
    raw: Float32Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
    runtimeMs: number,
) {
    // chess-corners 1.x narrowed the per-corner stride from 9 to 7: `contrast`
    // and `fit_rms` were removed along with the response-fit prefilter that
    // produced them. Nothing in the type-checker sees this — the detector
    // returns a bare Float32Array — so a stale stride here would silently
    // reinterpret axis angles as contrast and shear every corner's geometry.
    const stride = 7; // x, y, response, axis0_angle, axis0_sigma, axis1_angle, axis1_sigma
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
        const axis0_angle = raw[i * stride + 3];
        const axis0_sigma = raw[i * stride + 4];
        const axis1_angle = raw[i * stride + 5];
        const axis1_sigma = raw[i * stride + 6];

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(response)) continue;

        responseMin = Math.min(responseMin, response);
        responseMax = Math.max(responseMax, response);
        responseSum += response;

        corners.push({ x, y, response, axis0_angle, axis0_sigma, axis1_angle, axis1_sigma });
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
            threshold: (config.threshold as number) ?? 30,
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

type ChessModule = typeof import("@vitavision/chess-corners");

/**
 * Map the UI's refiner string to a chess-corners 0.11 `ChessRefiner`.
 * Mirrors the old `detector.set_refiner(<string>)` switch.
 */
function makeChessRefiner(mod: ChessModule, refiner: string) {
    switch (refiner) {
        case "forstner":
            return mod.ChessRefiner.withForstner(new mod.ForstnerConfig());
        case "saddle_point":
            return mod.ChessRefiner.withSaddlePoint(new mod.SaddlePointConfig());
        case "center_of_mass":
            return mod.ChessRefiner.withCenterOfMass(new mod.CenterOfMassConfig());
        default:
            throw new Error(`chess-corners config: unknown refiner "${refiner}"`);
    }
}

export async function handleChessCorners(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getChessModule();

    // chess-corners 0.11 replaced the flat per-field setters (set_threshold,
    // set_nms_radius, set_refiner, …) with the typed `DetectorConfig` builder.
    // Start from the multiscale ChESS preset (library defaults) and overlay only
    // the user-provided fields onto the shared-cell config tree, preserving the
    // old behaviour.
    //
    // 1.x then dropped the `Threshold` tagged enum: `cfg.threshold` is a plain
    // f32, an ABSOLUTE floor on the raw ChESS response (preset default 30).
    // There is no relative mode any more, so `config.threshold` is passed
    // through unscaled. It also moved the NMS / clustering knobs off
    // `ChessConfig` onto a shared `cfg.detection` honoured by both the ChESS
    // and Radon strategies — assigning `cfg.strategy.chess.nmsRadius` now
    // writes a plain JS property on the wrapper that reads back correctly and
    // never reaches WASM.
    //
    // The field setters (threshold, upscale, refiner) move their
    // wrapper into the tree, but `ChessDetector.withConfig` only *borrows* `cfg`
    // — it snapshots the config into the detector without consuming the handle —
    // so `cfg` must be freed explicitly after the detector is built, otherwise
    // the WASM-side config allocation leaks on every detection in the live
    // editor/webcam path.
    const cfg = mod.DetectorConfig.chessMultiscale();

    if (typeof config.threshold === "number") {
        cfg.threshold = config.threshold;
    }
    if (typeof config.upscaleFactor === "number") {
        cfg.upscale = config.upscaleFactor >= 2
            ? mod.UpscaleConfig.fixed(config.upscaleFactor)
            : mod.UpscaleConfig.disabled();
    }
    if (typeof config.pyramidLevels === "number") cfg.multiscale.levels = config.pyramidLevels;
    if (typeof config.pyramidMinSize === "number") cfg.multiscale.minSize = config.pyramidMinSize;

    if (typeof config.nmsRadius === "number") cfg.detection.nmsRadius = config.nmsRadius;
    if (typeof config.minClusterSize === "number") cfg.detection.minClusterSize = config.minClusterSize;

    const chess = cfg.strategy.chess;
    if (typeof config.broadMode === "boolean") {
        chess.ring = config.broadMode ? mod.ChessRing.Broad : mod.ChessRing.Canonical;
    }
    if (typeof config.refiner === "string") {
        chess.refiner = makeChessRefiner(mod, config.refiner);
    }

    // `withConfig` validates the config (e.g. upscale factor must be 2/3/4,
    // pyramid levels ≥ 1) and throws a descriptive Rust error on bad input.
    const detector = mod.ChessDetector.withConfig(cfg);
    // `withConfig` borrows the config rather than taking ownership, so release
    // the cfg handle (and the sub-tree it owns) now that the detector has
    // snapshotted it — verified safe: detection runs correctly post-free.
    cfg.free();
    try {
        const t0 = performance.now();
        const result = detector.detect_rgba(pixels, width, height);
        const runtimeMs = performance.now() - t0;

        return adaptChessCornersResult(result, width, height, config, runtimeMs);
    } finally {
        detector.free();
    }
}
