import { Callout } from "@vitavision/ui";
import ChessboardGenConfig from "./ChessboardGenConfig";
import CharucoGenConfig from "./CharucoGenConfig";
import MarkerBoardGenConfig from "./MarkerBoardGenConfig";
import RingGridGenConfig from "./RingGridGenConfig";
import PuzzleboardGenConfig from "./PuzzleboardGenConfig";
import PaperConfig from "./PaperConfig";
import DownloadBar, { type DxfGenerator } from "./DownloadBar";
import type { TargetGeneratorState, TargetGeneratorAction } from "../types";

export type TargetConfigSection = "pattern" | "page" | "validation" | "downloads";

interface Props {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    sections?: TargetConfigSection[];
    /** Forwarded to DownloadBar; see DxfGenerator for why it is injected. */
    generateDxf?: DxfGenerator;
}

const ALL_SECTIONS: TargetConfigSection[] = ["pattern", "page", "validation", "downloads"];

export default function TargetConfigPanel({ state, dispatch, sections = ALL_SECTIONS, generateDxf }: Props) {
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
            {visibleSections.has("pattern") && target.targetType === "ringgrid" && (
                <RingGridGenConfig config={target.config} dispatch={dispatch} />
            )}
            {visibleSections.has("pattern") && target.targetType === "puzzleboard" && (
                <PuzzleboardGenConfig config={target.config} dispatch={dispatch} />
            )}

            {/* Page config */}
            {visibleSections.has("page") && (
                <PaperConfig page={state.page} dispatch={dispatch} />
            )}

            {/* Validation messages */}
            {visibleSections.has("validation") && validation.errors.length > 0 && (
                <Callout tone="error" className="text-xs">
                    <ul className="flex flex-col gap-1">
                        {validation.errors.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                </Callout>
            )}
            {visibleSections.has("validation") && validation.warnings.length > 0 && (
                <Callout tone="warning" className="text-xs">
                    <ul className="flex flex-col gap-1">
                        {validation.warnings.map((w) => <li key={w}>{w}</li>)}
                    </ul>
                </Callout>
            )}

            {/* Download bar */}
            {visibleSections.has("downloads") && (
                <DownloadBar state={state} generateDxf={generateDxf} />
            )}
        </div>
    );
}
