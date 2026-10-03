import { useReducer, useEffect, useState } from "react";
import { targetGeneratorReducer, INITIAL_STATE } from "./reducer";
import { generatePreviewSvg } from "./svg";
import { validateConfig } from "./validation";
import type { TargetGeneratorState, TargetGeneratorAction } from "./types";
import { loadPuzzlepolePeriods } from "./puzzlepole/periods";
import type { PuzzlepolePeriod } from "./puzzlepole/geometry";

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
    }, [state.target, state.page]);

    return { state, dispatch, puzzlepolePeriods };
}
