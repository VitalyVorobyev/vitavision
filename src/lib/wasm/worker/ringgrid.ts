import { mapTargetBundle, mergeConfig, type TargetBundle } from "./util";
import { getRinggridModule } from "./modules";

export function adaptRinggridResult(
    jsonStr: string,
    width: number,
    height: number,
    runtimeMs: number,
) {
    const raw = JSON.parse(jsonStr) as Record<string, unknown>;
    const detectedMarkers = (raw.detected_markers as Array<Record<string, unknown>> | undefined) ?? [];

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

/**
 * Run the ring-grid detector. `config` is `{ board, config }`: a target spec
 * (`schemas/target_spec.json`) and a detection config (`schemas/detect_config.json`).
 *
 * The board goes in whole (it is a complete document; merging a default `hex` lattice into
 * a `rect` one would keep fields the variant does not have). The detection config is merged
 * over `default_config_json(board)` — a complete snapshot is what `with_config` takes, and
 * the fields the library derives from the board (the schema's `readOnly` ones) come from
 * there too.
 */
export async function handleRinggrid(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getRinggridModule();

    const board = (config.board as Record<string, unknown> | undefined) ?? (JSON.parse(mod.default_board_json()) as Record<string, unknown>);
    const boardJson = JSON.stringify(board);
    const defaults = JSON.parse(mod.default_config_json(boardJson)) as Record<string, unknown>;
    const detectConfig = mergeConfig(defaults, (config.config as Record<string, unknown> | undefined) ?? {});

    const detector = mod.RinggridDetector.with_config(boardJson, JSON.stringify(detectConfig));
    try {
        const t0 = performance.now();
        const resultJson = detector.detect_adaptive_rgba(pixels, width, height);
        const runtimeMs = performance.now() - t0;

        return adaptRinggridResult(resultJson, width, height, runtimeMs);
    } finally {
        detector.free();
    }
}

/**
 * Render a `ringgrid.target.v6` target (see
 * `src/components/targetgen/ringgridTarget.ts`) via `@vitavision/ringgrid`'s
 * own renderer, returning the full JSON/SVG/PNG/DXF bundle.
 *
 * Unlike `handleRenderTargetBundle` (calib-targets), `render_target_bundle_json`
 * here takes TWO JSON STRING arguments and runs through the ringgrid WASM
 * module (`getRinggridModule()`) — verified against the real 0.13.0 module,
 * see `ringgridTarget.ts`'s header comment for the verification method.
 */
export async function handleRenderRinggridBundle(targetJson: string, optionsJson: string): Promise<TargetBundle> {
    const mod = await getRinggridModule();
    const bundle = mod.render_target_bundle_json(targetJson, optionsJson);
    return mapTargetBundle(bundle);
}

/**
 * The printed page size a ring-grid target would occupy for the given render
 * options, as `[width_mm, height_mm]`. Companion to
 * `handleRenderRinggridBundle` for a "will this fit?" check without paying
 * for a full render — used by the board-dimension validation/preview path.
 */
export async function handleRinggridPageSize(targetJson: string, optionsJson: string): Promise<[number, number]> {
    const mod = await getRinggridModule();
    const sizeJson = mod.target_page_size_mm(targetJson, optionsJson);
    return JSON.parse(sizeJson) as [number, number];
}
