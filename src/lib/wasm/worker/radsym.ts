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
    const circles = [];

    // Whole triples only: a trailing partial triple is ignored.
    for (let i = 0; i + stride <= raw.length; i += stride) {
        const x = raw[i] ?? NaN;
        const y = raw[i + 1] ?? NaN;
        const score = raw[i + 2] ?? NaN;

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

/** What the editor stores for radsym: the proposal algorithm beside the package's `DetectCirclesConfig`. */
interface RadsymRequest {
    algorithm?: string;
    config?: Record<string, unknown>;
}

/**
 * A processor built from the config document (`schemas/detect_circles_config.json`).
 * `with_config_json` fills missing fields from the library defaults and throws on an
 * ill-typed or invalid one; enum values keep their Rust names ("Bright", "Sobel").
 */
async function createProcessor(request: RadsymRequest) {
    const mod = await getRadsymModule();
    return mod.RadSymProcessor.with_config_json(JSON.stringify(request.config ?? {}));
}

export async function handleRadsym(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const request = config as RadsymRequest;
    const processor = await createProcessor(request);
    try {
        const algorithm = request.algorithm ?? "frst";

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
    const request = config as RadsymRequest;
    const processor = await createProcessor(request);
    try {
        const algorithm = request.algorithm ?? "frst";
        const colormap = (config.colormap as string) ?? "magma";
        const rgba = processor.response_heatmap(pixels, width, height, algorithm, colormap);

        return { rgba, width, height };
    } finally {
        processor.free();
    }
}
