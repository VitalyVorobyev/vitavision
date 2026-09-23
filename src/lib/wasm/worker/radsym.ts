import { generateId } from "./util";
import { getRadsymModule } from "./modules";

/** Adapt extract_proposals output (stride 3: x, y, score) to RadsymResult. */
export function adaptRadsymProposalResult(
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

type RadsymModule = typeof import("@vitavision/radsym");
type RadSymProcessor = InstanceType<RadsymModule["RadSymProcessor"]>;

/**
 * Apply the UI config onto a `RadSymProcessor` via its setter methods.
 *
 * `mode: "full"` (detection, `handleRadsym`) applies every setter in the same
 * order the old inline block did. `mode: "heatmap"` (`handleRadsymHeatmap`)
 * applies exactly the subset that block used — radii, alpha,
 * gradientThreshold, smoothingFactor, polarity, gradientOperator, in that
 * same relative order — by skipping the detection-only setters (nmsRadius,
 * nmsThreshold, maxDetections, radiusHint, minScore) in place rather than
 * reordering calls, so both call sequences stay byte-identical to before.
 */
function applyRadsymConfig(
    processor: RadSymProcessor,
    config: Record<string, unknown>,
    mode: "full" | "heatmap",
): void {
    if (config.radii) processor.set_radii(config.radii as Uint32Array);
    if (config.alpha != null) processor.set_alpha(config.alpha as number);
    if (config.gradientThreshold != null) processor.set_gradient_threshold(config.gradientThreshold as number);
    if (config.smoothingFactor != null) processor.set_smoothing_factor(config.smoothingFactor as number);
    if (mode === "full") {
        if (config.nmsRadius != null) processor.set_nms_radius(config.nmsRadius as number);
        if (config.nmsThreshold != null) processor.set_nms_threshold(config.nmsThreshold as number);
        if (config.maxDetections != null) processor.set_max_detections(config.maxDetections as number);
    }
    if (config.polarity) processor.set_polarity(config.polarity as string);
    if (mode === "full") {
        if (config.radiusHint != null) processor.set_radius_hint(config.radiusHint as number);
        if (config.minScore != null) processor.set_min_score(config.minScore as number);
    }
    if (config.gradientOperator) processor.set_gradient_operator(config.gradientOperator as string);
}

export async function handleRadsym(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getRadsymModule();
    const processor = new mod.RadSymProcessor();
    try {
        applyRadsymConfig(processor, config, "full");

        const algorithm = (config.algorithm as string) ?? "frst";

        const t0 = performance.now();
        const result = processor.extract_proposals(pixels, width, height, algorithm);
        const runtimeMs = performance.now() - t0;

        return adaptRadsymProposalResult(result, width, height, runtimeMs);
    } finally {
        processor.free();
    }
}

export async function handleRadsymHeatmap(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
    const mod = await getRadsymModule();
    const processor = new mod.RadSymProcessor();
    try {
        applyRadsymConfig(processor, config, "heatmap");

        const algorithm = (config.algorithm as string) ?? "frst";
        const colormap = (config.colormap as string) ?? "magma";
        const rgba = processor.response_heatmap(pixels, width, height, algorithm, colormap);

        return { rgba, width, height };
    } finally {
        processor.free();
    }
}
