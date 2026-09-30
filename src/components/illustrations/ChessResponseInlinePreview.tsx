import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button, DensityProvider, SegmentedControl } from "@vitavision/ui";
import ChessResponseSvg from "./chess-response/ChessResponseSvg";
import { useChessResponse } from "./chess-response/useChessResponse";
import useChessResponseAnimation from "./chess-response/useChessResponseAnimation";
import { formatValue } from "./chess-response/readoutHelpers";
import { classNames } from "../../utils/helpers";
import type { ChessResponsePattern } from "./chess-response/types";
import { PATTERN_OPTIONS, toPattern } from "./chess-response/patternOptions";

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
        <DensityProvider value="compact">
        <section className="not-prose my-6 flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl border border-line bg-[linear-gradient(180deg,var(--surface),var(--ground))] p-4">
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
                    <div className="text-xs font-mono uppercase tracking-[0.18em] text-fg-muted">
                        ChESS response
                    </div>

                    {/* Pattern switcher */}
                    <SegmentedControl
                        aria-label="Pattern"
                        value={pattern}
                        options={PATTERN_OPTIONS}
                        onValueChange={(next) => {
                            const p = toPattern(next);
                            if (p) setPattern(p);
                        }}
                    />

                    {/* R metric pill */}
                    <div
                        className={classNames(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-mono",
                            response.response > 0
                                ? "border-normal/30 bg-normal/10 text-normal"
                                : "border-warn/30 bg-warn/10 text-warn",
                        )}
                    >
                        <span className="text-fg-muted">R =</span>
                        <span className="font-semibold">{formatValue(response.response)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Play/pause */}
                    <Button
                        aria-label={playing ? "Pause rotation" : "Play rotation"}
                        onClick={() => setPlaying((p) => !p)}
                        icon={playing ? <Pause /> : <Play />}
                    >
                        {playing ? "Pause" : "Play"}
                    </Button>

                    {/* Link to full demo (plain <a> so it works inside createRoot subtrees
                         that don't inherit the outer React Router context) */}
                    <a
                        href="/demos/chess-response"
                        className="text-xs text-fg-muted hover:text-fg transition-colors"
                    >
                        Open full demo &rarr;
                    </a>
                </div>
            </div>
        </section>
        </DensityProvider>
    );
}
