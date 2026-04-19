import { AlertCircle, AlertTriangle } from "lucide-react";
import ChessboardGenConfig from "./ChessboardGenConfig";
import CharucoGenConfig from "./CharucoGenConfig";
import MarkerBoardGenConfig from "./MarkerBoardGenConfig";
import RingGridGenConfig from "./RingGridGenConfig";
import PuzzleboardGenConfig from "./PuzzleboardGenConfig";
import PaperConfig from "./PaperConfig";
import DownloadBar from "./DownloadBar";
import type { TargetGeneratorState, TargetGeneratorAction } from "../types";

export type TargetConfigSection = "pattern" | "page" | "validation" | "downloads";

interface Props {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    sections?: TargetConfigSection[];
}

const ALL_SECTIONS: TargetConfigSection[] = ["pattern", "page", "validation", "downloads"];

export default function TargetConfigPanel({ state, dispatch, sections = ALL_SECTIONS }: Props) {
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
                <div className="flex flex-col gap-1 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2.5">
                    {validation.errors.map((e) => (
                        <div key={e} className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />
                            {e}
                        </div>
                    ))}
                </div>
            )}
            {visibleSections.has("validation") && validation.warnings.length > 0 && (
                <div className="flex flex-col gap-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5">
                    {validation.warnings.map((w) => (
                        <div key={w} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                            {w}
                        </div>
                    ))}
                </div>
            )}

            {/* Download bar */}
            {visibleSections.has("downloads") && (
                <DownloadBar state={state} />
            )}
        </div>
    );
}
