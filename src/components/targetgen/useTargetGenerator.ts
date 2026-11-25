import { useReducer, useEffect, useState } from "react";
import { targetGeneratorReducer, INITIAL_STATE } from "./reducer";
import { generatePreviewSvg } from "./svg";
import { validateConfig, validateScreenConfig, screenGeometryWarnings } from "./validation";
import { renderScreenViaWasm } from "./renderScreenViaWasm";
import type { TargetGeneratorState, TargetGeneratorAction } from "./types";
import { loadPuzzlepolePeriods } from "./puzzlepole/periods";
import type { PuzzlepolePeriod } from "./puzzlepole/geometry";

const SCREEN_RENDER_DEBOUNCE_MS = 250;

export function useTargetGenerator(): {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    /** The library's supported PuzzlePole periods; `undefined` until loaded. */
    puzzlepolePeriods: readonly PuzzlepolePeriod[] | undefined;
} {
    const [state, dispatch] = useReducer(targetGeneratorReducer, INITIAL_STATE);
    const [puzzlepolePeriods, setPuzzlepolePeriods] = useState<readonly PuzzlepolePeriod[]>();

    useEffect(() => {
        let cancelled = false;
        loadPuzzlepolePeriods()
            .then((periods) => {
                if (!cancelled) setPuzzlepolePeriods(periods);
            })
            .catch((err) => console.error("Could not load PuzzlePole periods:", err));
        return () => {
            cancelled = true;
        };
    }, []);

    // Regenerate preview on every config/page change
    useEffect(() => {
        if (state.medium !== "print") return;
        let cancelled = false;

        generatePreviewSvg(state.target, state.page)
            .then(async (svg) => {
                if (cancelled) return;
                const validation = await validateConfig(state.target, state.page);
                if (cancelled) return;
                dispatch({ type: "SET_PREVIEW", svg, validation });
            })
            .catch(async (err) => {
                if (cancelled) return;
                console.error("SVG preview generation failed:", err);
                // The library refuses some configs outright (a PuzzlePole period
                // that does not close, a board that does not fit the page).
                // Run validation anyway so the user sees why, in words, instead
                // of a stale preview and nothing else.
                const validation = await validateConfig(state.target, state.page);
                if (cancelled) return;
                if (validation.errors.length === 0) {
                    validation.errors.push(`Preview failed: ${err instanceof Error ? err.message : String(err)}`);
                }
                dispatch({ type: "SET_PREVIEW", svg: "", validation });
            });

        return () => {
            cancelled = true;
        };
    }, [state.medium, state.target, state.page]);

    // Screen medium: render the real native-resolution PNG (debounced — a
    // full-display render is far heavier than the SVG preview). Pure checks run
    // first; whatever only the library can judge arrives as a thrown message
    // and is shown as a validation error.
    useEffect(() => {
        if (state.medium !== "screen") return;
        let cancelled = false;
        const timer = setTimeout(() => {
            const validation = validateScreenConfig(state.target, state.screen);
            if (validation.errors.length > 0) {
                dispatch({ type: "SET_SCREEN_PREVIEW", result: null, validation });
                return;
            }
            renderScreenViaWasm(state.target, state.screen)
                .then((result) => {
                    if (cancelled) return;
                    validation.warnings.push(...screenGeometryWarnings(result.geometry));
                    dispatch({ type: "SET_SCREEN_PREVIEW", result, validation });
                })
                .catch((err) => {
                    if (cancelled) return;
                    validation.errors.push(err instanceof Error ? err.message : String(err));
                    dispatch({ type: "SET_SCREEN_PREVIEW", result: null, validation });
                });
        }, SCREEN_RENDER_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [state.medium, state.target, state.screen]);

    return { state, dispatch, puzzlepolePeriods };
}
