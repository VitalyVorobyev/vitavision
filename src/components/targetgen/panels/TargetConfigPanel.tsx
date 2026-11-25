import { Callout } from "@vitavision/ui";
import ChessboardGenConfig from "./ChessboardGenConfig";
import CharucoGenConfig from "./CharucoGenConfig";
import MarkerBoardGenConfig from "./MarkerBoardGenConfig";
import RingGridGenConfig from "./RingGridGenConfig";
import PuzzleboardGenConfig from "./PuzzleboardGenConfig";
import PuzzlepoleGenConfig from "./PuzzlepoleGenConfig";
import PaperConfig from "./PaperConfig";
import ScreenConfig, { MediumSwitch } from "./ScreenConfig";
import ScreenGeometryPanel from "./ScreenGeometryPanel";
import { isScreenSupported, screenUnsupportedMessage } from "../screenTarget";
import DownloadBar, { type DxfGenerator } from "./DownloadBar";
import type { TargetGeneratorState, TargetGeneratorAction } from "../types";
import type { PuzzlepolePeriod } from "../puzzlepole/geometry";

export type TargetConfigSection = "pattern" | "page" | "validation" | "downloads";

interface Props {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    sections?: TargetConfigSection[];
    /** Forwarded to DownloadBar; see DxfGenerator for why it is injected. */
    generateDxf?: DxfGenerator | undefined;
    /**
     * The library's supported PuzzlePole periods, forwarded to
     * PuzzlepoleGenConfig. Injected for the same reason as `generateDxf`: they
     * come from the WASM worker, which this synced component must not import.
     */
    puzzlepolePeriods?: readonly PuzzlepolePeriod[] | undefined;
}

const ALL_SECTIONS: TargetConfigSection[] = ["pattern", "page", "validation", "downloads"];

export default function TargetConfigPanel({
    state,
    dispatch,
    sections = ALL_SECTIONS,
    generateDxf,
    puzzlepolePeriods,
}: Props) {
    const { target, validation } = state;
    const visibleSections = new Set(sections);

    return (
        <div className="flex flex-col gap-3 p-3 overflow-y-auto">
            {/* Type-specific config */}
            {visibleSections.has("pattern") && target.targetType === "chessboard" && (
                <ChessboardGenConfig config={target.config} dispatch={dispatch} />
            )}
            {visibleSections.has("pattern") && target.targetType === "charuco" && (
                <CharucoGenConfig config={target.config} dispatch={dispatch} />
            )}
            {visibleSections.has("pattern") && target.targetType === "markerboard" && (
                <MarkerBoardGenConfig config={target.config} dispatch={dispatch} />
            )}
            {visibleSections.has("pattern") && target.targetType === "ringgrid" && state.medium === "screen" && (
                <Callout tone="info" title="Fitted to the display" className="text-xs">
                    In Screen mode the library fits the number of rows and columns to fill the display, so those two
                    fields only seed the template and do not determine the output. The pitch and marker proportions
                    still apply; the marker size comes from the radii and ring width. The realised grid is reported on
                    the Export step.
                </Callout>
            )}
            {visibleSections.has("pattern") && target.targetType === "ringgrid" && (
                <RingGridGenConfig config={target.config} dispatch={dispatch} />
            )}
            {visibleSections.has("pattern") && target.targetType === "puzzleboard" && (
                <PuzzleboardGenConfig config={target.config} dispatch={dispatch} />
            )}
            {visibleSections.has("pattern") && target.targetType === "puzzlepole" && (
                <PuzzlepoleGenConfig config={target.config} dispatch={dispatch} periods={puzzlepolePeriods} />
            )}

            {/* Page config */}
            {visibleSections.has("page") && <MediumSwitch medium={state.medium} dispatch={dispatch} />}
            {visibleSections.has("page") && state.medium === "print" && (
                <PaperConfig page={state.page} dispatch={dispatch} />
            )}
            {visibleSections.has("page") && state.medium === "screen" && (
                <>
                    {!isScreenSupported(target.targetType) && (
                        <Callout tone="error" className="text-xs">
                            {screenUnsupportedMessage(target.targetType)}
                        </Callout>
                    )}
                    <ScreenConfig screen={state.screen} dispatch={dispatch} />
                </>
            )}

            {/* Validation messages */}
            {visibleSections.has("validation") && validation.errors.length > 0 && (
                <Callout tone="error" className="text-xs">
                    <ul className="flex flex-col gap-1">
                        {validation.errors.map((e) => (
                            <li key={e}>{e}</li>
                        ))}
                    </ul>
                </Callout>
            )}
            {visibleSections.has("validation") && validation.warnings.length > 0 && (
                <Callout tone="warning" className="text-xs">
                    <ul className="flex flex-col gap-1">
                        {validation.warnings.map((w) => (
                            <li key={w}>{w}</li>
                        ))}
                    </ul>
                </Callout>
            )}

            {visibleSections.has("validation") && state.medium === "screen" && (
                <ScreenGeometryPanel result={state.screenResult} />
            )}

            {/* Download bar */}
            {visibleSections.has("downloads") && <DownloadBar state={state} generateDxf={generateDxf} />}
        </div>
    );
}
