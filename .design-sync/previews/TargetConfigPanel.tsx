import { useReducer } from "react";
import { TargetConfigPanel } from "vitcv";
import { targetGeneratorReducer } from "../../src/components/targetgen/reducer";
import {
    CHARUCO_PRESETS,
    PUZZLEPOLE_PRESETS,
} from "../../src/components/targetgen/presets";
import type { TargetGeneratorState, ChessboardConfig } from "../../src/components/targetgen/types";
import { A4_LANDSCAPE, PUZZLEPOLE_PERIODS, first, settledState } from "../fixtures/targetgen";

// Real desktop usage (src/pages/TargetGenerator.tsx): a `w-80` right rail.
function Rail({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 320 }} className="border-l border-line bg-raised/20">
            {children}
        </div>
    );
}

// Preview SVG and validation are static stand-ins (../fixtures/targetgen.ts): the real ones
// come from the WASM worker, which a design render does not have.
function usePanelState(initial: TargetGeneratorState) {
    return useReducer(targetGeneratorReducer, initial);
}

export const ChessboardAllSections = () => {
    const config: ChessboardConfig = { innerRows: 7, innerCols: 10, squareSizeMm: 20, innerSquareRel: 0 };
    const [state, dispatch] = usePanelState(settledState({ targetType: "chessboard", config }, A4_LANDSCAPE));
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} />
        </Rail>
    );
};

export const CharucoPatternOnly = () => {
    const preset = first(CHARUCO_PRESETS);
    const [state, dispatch] = usePanelState(settledState(preset.target, preset.page));
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["pattern"]} />
        </Rail>
    );
};

export const RingGridPageOnly = () => {
    const [state, dispatch] = usePanelState(
        settledState(
            {
                targetType: "ringgrid",
                config: {
                    rows: 15,
                    longRowCols: 14,
                    pitchMm: 8.0,
                    markerOuterRadiusMm: 5.6,
                    markerInnerRadiusMm: 3.2,
                    markerRingWidthMm: 0.8,
                    profile: "baseline",
                },
            },
            A4_LANDSCAPE,
        ),
    );
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["page"]} />
        </Rail>
    );
};

// With `puzzlepolePeriods` the circumference and seam row are pickers limited to the values
// that close seamlessly. The list comes from the WASM worker in the app.
export const PuzzlePolePattern = () => {
    const preset = first(PUZZLEPOLE_PRESETS);
    const [state, dispatch] = usePanelState(settledState(preset.target, preset.page));
    return (
        <Rail>
            <TargetConfigPanel
                state={state}
                dispatch={dispatch}
                sections={["pattern"]}
                puzzlepolePeriods={PUZZLEPOLE_PERIODS}
            />
        </Rail>
    );
};

// Without the list (a bare design render), both fields fall back to plain number inputs.
export const PuzzlePoleWithoutPeriods = () => {
    const preset = first(PUZZLEPOLE_PRESETS);
    const [state, dispatch] = usePanelState(settledState(preset.target, preset.page));
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["pattern"]} />
        </Rail>
    );
};

export const ValidationBlockedExport = () => {
    // Oversized board on a standard A4 sheet: the fit check fails, which greys out
    // DownloadBar's buttons and shows the error callout.
    const oversized: ChessboardConfig = { innerRows: 9, innerCols: 13, squareSizeMm: 50, innerSquareRel: 0 };
    const [state, dispatch] = usePanelState(settledState({ targetType: "chessboard", config: oversized }, A4_LANDSCAPE));
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["validation", "downloads"]} />
        </Rail>
    );
};
