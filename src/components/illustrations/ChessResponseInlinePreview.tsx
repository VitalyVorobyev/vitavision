import { useState } from "react";
import { Pause, Play } from "lucide-react";
import ChessResponseSvg from "./chess-response/ChessResponseSvg";
import { useChessResponse } from "./chess-response/useChessResponse";
import useChessResponseAnimation from "./chess-response/useChessResponseAnimation";
import { formatValue } from "./chess-response/readoutHelpers";
import { classNames } from "../../utils/helpers";
import type { ChessResponsePattern } from "./chess-response/types";

export interface ChessResponseInlinePreviewProps {
    initialPattern?: ChessResponsePattern;
    initialRotation?: number;
    initialBlur?: number;
    initialContrast?: number;
}

export default function ChessResponseInlinePreview({
    initialPattern = "corner",
    initialRotation = 22.5,
    initialBlur = 0.18,
    initialContrast = 1.08,
}: ChessResponseInlinePreviewProps) {
    const [pattern, setPattern] = useState<ChessResponsePattern>(initialPattern);
    const [rotationDeg, setRotationDeg] = useState(initialRotation);
    const [playing, setPlaying] = useState(false);
    const speed = 1;

    useChessResponseAnimation({
        playing,
        speed,
        onTick: setRotationDeg,
    });

    const response = useChessResponse({
        pattern,
        rotationDeg,
        blur: initialBlur,
        contrast: initialContrast,
    });

    return (
        <section className="not-prose my-6 flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] p-4">
            {/* Mini SVG */}
            <div className="w-full sm:w-auto sm:max-w-[12rem] shrink-0">
                <ChessResponseSvg
                    patternLabel={pattern}
                    rotationDeg={rotationDeg}
                    computation={response}
                    showSampleLabels={false}
                    showSrPairs={true}
                    showDrPairs={false}
                    showMrRegions={false}
                />
            </div>

            {/* Right column */}
            <div className="flex flex-col justify-between gap-3 min-w-0">
                <div className="space-y-3">
                    <div className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        ChESS response
                    </div>

                    {/* Pattern switcher */}
                    <div className="flex gap-1.5">
                        {(["corner", "edge", "stripe"] as ChessResponsePattern[]).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setPattern(option)}
                                className={classNames(
                                    "rounded-xl border px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                                    pattern === option
                                        ? "border-primary/30 bg-primary/10 text-foreground"
                                        : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    {/* R metric pill */}
                    <div
                        className={classNames(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-mono",
                            response.response > 0
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                        )}
                    >
                        <span className="text-muted-foreground">R =</span>
                        <span className="font-semibold">{formatValue(response.response)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Play/pause */}
                    <button
                        type="button"
                        aria-label={playing ? "Pause rotation" : "Play rotation"}
                        onClick={() => setPlaying((p) => !p)}
                        className={classNames(
                            "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                            playing
                                ? "border-primary/30 bg-primary/10 text-foreground"
                                : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {playing ? "Pause" : "Play"}
                    </button>

                    {/* Link to full demo (plain <a> so it works inside createRoot subtrees
                         that don't inherit the outer React Router context) */}
                    <a
                        href="/demos/chess-response"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Open full demo &rarr;
                    </a>
                </div>
            </div>
        </section>
    );
}
