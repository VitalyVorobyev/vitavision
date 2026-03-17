import { useReducer, useEffect } from "react";
import { targetGeneratorReducer, INITIAL_STATE } from "./reducer";
import { generatePreviewSvg } from "./svg";
import { validateConfig } from "./validation";
import type { TargetGeneratorState, TargetGeneratorAction } from "./types";

export function useTargetGenerator(): {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
} {
    const [state, dispatch] = useReducer(targetGeneratorReducer, INITIAL_STATE);

    // Regenerate preview on every config/page change
    useEffect(() => {
        let cancelled = false;

        generatePreviewSvg(state.target, state.page).then((svg) => {
            if (cancelled) return;
            const validation = validateConfig(state.target, state.page);
            dispatch({ type: "SET_PREVIEW", svg, validation });
        });

        return () => {
            cancelled = true;
        };
    }, [state.target, state.page]);

    return { state, dispatch };
}
