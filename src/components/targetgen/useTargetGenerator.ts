import { useReducer, useEffect, useCallback } from "react";
import { targetGeneratorReducer, INITIAL_STATE } from "./reducer";
import { generatePreviewSvg, generateFinalSvg } from "./svg";
import { validateConfig } from "./validation";
import { generateCalibrationTarget } from "../../lib/api";
import type { TargetGeneratorState, TargetGeneratorAction } from "./types";

export function useTargetGenerator(): {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    generate: () => Promise<void>;
} {
    const [state, dispatch] = useReducer(targetGeneratorReducer, INITIAL_STATE);

    // Regenerate preview on every config/page change
    useEffect(() => {
        const svg = generatePreviewSvg(state.target, state.page);
        const validation = validateConfig(state.target, state.page);
        dispatch({ type: "SET_PREVIEW", svg, validation });
    }, [state.target, state.page]);

    const generate = useCallback(async () => {
        if (state.validation.errors.length > 0) return;

        dispatch({ type: "GENERATION_START" });

        try {
            // Try client-side first
            const clientSvg = generateFinalSvg(state.target, state.page);
            if (clientSvg !== null) {
                const configJson = JSON.stringify(
                    { target: state.target, page: state.page },
                    null,
                    2,
                );
                dispatch({
                    type: "GENERATION_SUCCESS",
                    svg: clientSvg,
                    configJson,
                });
                return;
            }

            // CharUco — call backend
            if (state.target.targetType === "charuco") {
                const cfg = state.target.config;
                const result = await generateCalibrationTarget({
                    config: {
                        target_type: "charuco",
                        rows: cfg.rows,
                        cols: cfg.cols,
                        square_size_mm: cfg.squareSizeMm,
                        marker_size_rel: cfg.markerSizeRel,
                        dictionary: cfg.dictionary,
                        border_bits: cfg.borderBits,
                    },
                    page: {
                        size: {
                            kind: state.page.sizeKind,
                            width_mm:
                                state.page.sizeKind === "custom"
                                    ? state.page.customWidthMm
                                    : undefined,
                            height_mm:
                                state.page.sizeKind === "custom"
                                    ? state.page.customHeightMm
                                    : undefined,
                        },
                        orientation: state.page.orientation,
                        margin_mm: state.page.marginMm,
                    },
                    render: { debug_annotations: false, png_dpi: 300 },
                    include_png: false,
                });
                dispatch({
                    type: "GENERATION_SUCCESS",
                    svg: result.svg,
                    configJson: result.config_json,
                });
            }
        } catch (err) {
            dispatch({
                type: "GENERATION_ERROR",
                message: err instanceof Error ? err.message : "Generation failed",
            });
        }
    }, [state.target, state.page, state.validation.errors.length]);

    return { state, dispatch, generate };
}
