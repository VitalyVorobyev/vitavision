import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import ChessboardGenConfig from "./ChessboardGenConfig";
import CharucoGenConfig from "./CharucoGenConfig";
import MarkerBoardGenConfig from "./MarkerBoardGenConfig";
import PaperConfig from "./PaperConfig";
import DownloadBar from "./DownloadBar";
import type { TargetGeneratorState, TargetGeneratorAction } from "../types";

interface Props {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    generate: () => Promise<void>;
}

export default function TargetConfigPanel({ state, dispatch, generate }: Props) {
    const { target, validation, generationStatus, errorMessage } = state;
    const hasErrors = validation.errors.length > 0;
    const isGenerating = generationStatus === "generating";

    return (
        <div className="flex flex-col gap-3 p-3 overflow-y-auto">
            {/* Type-specific config */}
            {target.targetType === "chessboard" && (
                <ChessboardGenConfig config={target.config} dispatch={dispatch} />
            )}
            {target.targetType === "charuco" && (
                <CharucoGenConfig config={target.config} dispatch={dispatch} />
            )}
            {target.targetType === "markerboard" && (
                <MarkerBoardGenConfig config={target.config} dispatch={dispatch} />
            )}

            {/* Page config */}
            <PaperConfig page={state.page} dispatch={dispatch} />

            {/* Validation messages */}
            {validation.errors.length > 0 && (
                <div className="flex flex-col gap-1 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2.5">
                    {validation.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />
                            {e}
                        </div>
                    ))}
                </div>
            )}
            {validation.warnings.length > 0 && (
                <div className="flex flex-col gap-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5">
                    {validation.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                            {w}
                        </div>
                    ))}
                </div>
            )}

            {/* Generate button */}
            <button
                onClick={generate}
                disabled={hasErrors || isGenerating}
                className={
                    "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
                    (hasErrors
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90")
                }
            >
                {isGenerating && <Loader2 size={14} className="animate-spin" />}
                {isGenerating ? "Generating..." : "Generate"}
            </button>

            {/* Error from backend */}
            {generationStatus === "error" && errorMessage && (
                <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2.5 text-xs text-red-700 dark:text-red-400">
                    {errorMessage}
                </div>
            )}

            {/* Download bar */}
            <DownloadBar state={state} generate={generate} />
        </div>
    );
}
