import { useReducer } from "react";
import { TargetPreview } from "vitcv";
import { targetGeneratorReducer } from "../../src/components/targetgen/reducer";
import {
    CHESSBOARD_PRESETS,
    CHARUCO_PRESETS,
    MARKERBOARD_PRESETS,
    RINGGRID_PRESETS,
    PUZZLEBOARD_PRESETS,
    PUZZLEPOLE_PRESETS,
} from "../../src/components/targetgen/presets";
import type { Preset } from "../../src/components/targetgen/presets";
import { first, settledState } from "../fixtures/targetgen";

// The component displays `state.previewSvg`; the app fills it through the WASM worker, which a
// design render does not have. `settledState` (../fixtures/targetgen.ts) supplies a sketched
// SVG for the preset's board instead, so every kind renders without a fetch or a worker.
function Preview({ preset }: { preset: Preset }) {
    const [state, dispatch] = useReducer(targetGeneratorReducer, settledState(preset.target, preset.page));
    return (
        <div style={{ width: 640, height: 420 }} className="overflow-hidden rounded-panel border border-line">
            <TargetPreview state={state} dispatch={dispatch} />
        </div>
    );
}

export const Chessboard = () => <Preview preset={first(CHESSBOARD_PRESETS)} />;
export const Charuco = () => <Preview preset={first(CHARUCO_PRESETS)} />;
export const MarkerBoard = () => <Preview preset={first(MARKERBOARD_PRESETS)} />;
export const RingGrid = () => <Preview preset={first(RINGGRID_PRESETS)} />;
export const PuzzleBoard = () => <Preview preset={first(PUZZLEBOARD_PRESETS)} />;
export const PuzzlePole = () => <Preview preset={first(PUZZLEPOLE_PRESETS)} />;
