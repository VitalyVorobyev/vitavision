import { useState } from "react";
import ChessResponseSvg from "./chess-response/ChessResponseSvg";
import { useChessResponse } from "./chess-response/useChessResponse";
import ChessResponseControls from "./chess-response/ChessResponseControls";
import ChessResponseReadouts from "./chess-response/ChessResponseReadouts";
import useChessResponseAnimation from "./chess-response/useChessResponseAnimation";
import type { ChessResponsePattern } from "./chess-response/types";

export default function ChessResponseDemo() {
    const [pattern, setPattern] = useState<ChessResponsePattern>("corner");
    const [rotationDeg, setRotationDeg] = useState(22.5);
    const [blur, setBlur] = useState(0.18);
    const [contrast, setContrast] = useState(1.08);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSampleLabels, setShowSampleLabels] = useState(true);
    const [showSrPairs, setShowSrPairs] = useState(true);
    const [showDrPairs, setShowDrPairs] = useState(true);
    const [showMrRegions, setShowMrRegions] = useState(true);

    useChessResponseAnimation({
        playing,
        speed,
        onTick: setRotationDeg,
    });

    const response = useChessResponse({ pattern, rotationDeg, blur, contrast });

    return (
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 py-2">
            {/* 3-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[clamp(18rem,22vw,24rem)_minmax(0,1fr)_clamp(20rem,24vw,28rem)] gap-6">
                {/* Controls column */}
                <div className="order-2 lg:order-1 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 py-4 sm:px-5 sm:py-5">
                    <ChessResponseControls
                        pattern={pattern}
                        onPatternChange={setPattern}
                        rotationDeg={rotationDeg}
                        onRotationChange={setRotationDeg}
                        blur={blur}
                        onBlurChange={setBlur}
                        contrast={contrast}
                        onContrastChange={setContrast}
                        showSampleLabels={showSampleLabels}
                        onShowSampleLabelsChange={setShowSampleLabels}
                        showSrPairs={showSrPairs}
                        onShowSrPairsChange={setShowSrPairs}
                        showDrPairs={showDrPairs}
                        onShowDrPairsChange={setShowDrPairs}
                        showMrRegions={showMrRegions}
                        onShowMrRegionsChange={setShowMrRegions}
                        playing={playing}
                        onPlayingChange={setPlaying}
                        speed={speed}
                        onSpeedChange={setSpeed}
                        variant="full"
                    />
                </div>

                {/* Canvas column */}
                <div className="order-1 lg:order-2 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex flex-col gap-4">
                        <div className="mx-auto w-full" style={{ maxWidth: "min(100%, 72vh)" }}>
                            <ChessResponseSvg
                                patternLabel={pattern}
                                rotationDeg={rotationDeg}
                                computation={response}
                                showSampleLabels={showSampleLabels}
                                showSrPairs={showSrPairs}
                                showDrPairs={showDrPairs}
                                showMrRegions={showMrRegions}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${response.status.className}`}
                            >
                                {response.status.label}
                            </span>
                            <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground">
                                pattern = {pattern}
                            </span>
                            <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground">
                                θ = {rotationDeg.toFixed(1)}°
                            </span>
                            <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground">
                                R = SR − DR − 16·MR
                            </span>
                        </div>
                    </div>
                </div>

                {/* Readouts column */}
                <div className="order-3 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 py-4 sm:px-5 sm:py-5 overflow-y-auto">
                    <ChessResponseReadouts response={response} showTermBreakdowns={true} />
                </div>
            </div>
        </div>
    );
}
