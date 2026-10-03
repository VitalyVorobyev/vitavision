import { generateId } from "./util";
import { getChessModule } from "./modules";

export function adaptChessCornersResult(
    raw: Float32Array,
    width: number,
    height: number,
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

    // `raw.length % stride === 0` is checked above and `count = raw.length / stride`,
    // so every `raw[i * stride + k]` (k < stride) below is in bounds.
    for (let i = 0; i < count; i++) {
        const x = raw[i * stride]!;
        const y = raw[i * stride + 1]!;
        const response = raw[i * stride + 2]!;
        const axis0_angle = raw[i * stride + 3]!;
        const axis0_sigma = raw[i * stride + 4]!;
        const axis1_angle = raw[i * stride + 5]!;
        const axis1_sigma = raw[i * stride + 6]!;

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

    // Sorted by confidence descending: first = most confident, last = least.
    const mostConfident = cornersOut[0];
    const leastConfident = cornersOut[cornersOut.length - 1];

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
            count: cornersOut.length,
            response_min: cornersOut.length > 0 ? responseMin : null,
            response_max: cornersOut.length > 0 ? responseMax : null,
            response_mean: cornersOut.length > 0 ? responseSum / cornersOut.length : null,
            confidence_min: leastConfident ? leastConfident.confidence : null,
            confidence_max: mostConfident ? mostConfident.confidence : null,
            runtime_ms: runtimeMs,
        },
        corners: cornersOut.map(({ _index: _, ...rest }) => rest),
    };
}

/**
 * Run the ChESS detector with `config`: a `DetectorConfig` document, in the shape
 * `schemas/detector_config.json` describes (the editor stores exactly that).
 *
 * `DetectorConfig.fromJson` takes a partial document and fills what is missing from the
 * library defaults, and validates the rest (`ChessDetector.withConfig` rejects, with a
 * descriptive Rust error, an upscale factor outside 2..=4, zero pyramid levels, ...).
 *
 * `withConfig` only *borrows* the config — it snapshots it into the detector without
 * consuming the handle — so `cfg` must be freed explicitly afterwards, otherwise the
 * WASM-side allocation leaks on every detection in the live editor/webcam path.
 */
export async function handleChessCorners(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getChessModule();

    const cfg = mod.DetectorConfig.fromJson(JSON.stringify(config));
    let detector: InstanceType<typeof mod.ChessDetector>;
    try {
        detector = mod.ChessDetector.withConfig(cfg);
    } finally {
        cfg.free();
    }
    try {
        const t0 = performance.now();
        const result = detector.detect_rgba(pixels, width, height);
        const runtimeMs = performance.now() - t0;

        return adaptChessCornersResult(result, width, height, runtimeMs);
    } finally {
        detector.free();
    }
}
