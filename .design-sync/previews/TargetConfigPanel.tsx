import { useReducer } from "react";
import { TargetConfigPanel } from "vitcv";
import { targetGeneratorReducer } from "../../src/components/targetgen/reducer";
import { CHARUCO_PRESETS } from "../../src/components/targetgen/presets";
import { validateConfig } from "../../src/components/targetgen/validation";
import { chessboardSvg } from "../../src/components/targetgen/svg/chessboardSvg";
import { resolvePageDimensions } from "../../src/components/targetgen/svg/paperConstants";
import type { TargetGeneratorState, TargetGeneratorAction, ChessboardConfig } from "../../src/components/targetgen/types";

// Validation is computed synchronously (validateConfig), same as the real
// reducer's SET_PREVIEW path — no async board-render needed for a panel that
// only reads `state.validation` and `state.previewSvg` truthiness.
function useConfiguredState(
    target: TargetGeneratorState["target"],
    page: TargetGeneratorState["page"],
    previewSvg = "",
) {
    return useReducer(targetGeneratorReducer, {
        target,
        page,
        previewSvg,
        validation: validateConfig(target, page),
        configCache: {},
    } satisfies TargetGeneratorState);
}

// Real desktop usage (src/pages/TargetGenerator.tsx): a `w-80` right rail.
function Rail({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 320 }} className="border-l border-border bg-muted/20">
            {children}
        </div>
    );
}

const A4_LANDSCAPE = {
    sizeKind: "a4" as const,
    customWidthMm: 210,
    customHeightMm: 297,
    orientation: "landscape" as const,
    marginMm: 10,
    pngDpi: 300,
    showScaleLine: true,
};

const CHESSBOARD_CAMERA_CAL: ChessboardConfig = { innerRows: 7, innerCols: 10, squareSizeMm: 20, innerSquareRel: 0 };

export const ChessboardAllSections = () => {
    const target: TargetGeneratorState["target"] = { targetType: "chessboard", config: CHESSBOARD_CAMERA_CAL };
    // Real synchronous SVG generator (chessboardSvg needs no dictionary/
    // codebook fetch) — a genuinely non-empty preview so the Downloads
    // section's buttons render enabled, matching a settled real run.
    const svg = chessboardSvg(CHESSBOARD_CAMERA_CAL, resolvePageDimensions(A4_LANDSCAPE));
    const [state, dispatch]: [TargetGeneratorState, React.Dispatch<TargetGeneratorAction>] = useConfiguredState(
        target,
        A4_LANDSCAPE,
        svg,
    );
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} />
        </Rail>
    );
};

export const CharucoPatternOnly = () => {
    const preset = CHARUCO_PRESETS[0];
    const [state, dispatch]: [TargetGeneratorState, React.Dispatch<TargetGeneratorAction>] = useConfiguredState(
        preset.target,
        preset.page,
    );
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["pattern"]} />
        </Rail>
    );
};

export const RingGridPageOnly = () => {
    const [state, dispatch]: [TargetGeneratorState, React.Dispatch<TargetGeneratorAction>] = useConfiguredState(
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
    );
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["page"]} />
        </Rail>
    );
};

export const ValidationBlockedExport = () => {
    // Oversized board on a standard A4 sheet — trips the real "does not fit
    // the printable area" error path in validation.ts, which grays out
    // DownloadBar's buttons and shows the red error banner.
    const oversized: ChessboardConfig = { innerRows: 9, innerCols: 13, squareSizeMm: 50, innerSquareRel: 0 };
    const target: TargetGeneratorState["target"] = { targetType: "chessboard", config: oversized };
    const svg = chessboardSvg(oversized, resolvePageDimensions(A4_LANDSCAPE));
    const [state, dispatch]: [TargetGeneratorState, React.Dispatch<TargetGeneratorAction>] = useConfiguredState(
        target,
        A4_LANDSCAPE,
        svg,
    );
    return (
        <Rail>
            <TargetConfigPanel state={state} dispatch={dispatch} sections={["validation", "downloads"]} />
        </Rail>
    );
};
