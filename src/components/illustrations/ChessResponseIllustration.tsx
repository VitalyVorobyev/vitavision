import { useState } from "react";
import { classNames } from "../../utils/helpers";
import ChessResponseSvg from "./chess-response/ChessResponseSvg";
import { useChessResponse } from "./chess-response/useChessResponse";
import ChessResponseControls from "./chess-response/ChessResponseControls";
import ChessResponseReadouts from "./chess-response/ChessResponseReadouts";
import useChessResponseAnimation from "./chess-response/useChessResponseAnimation";
import ChessResponseInlinePreview from "./ChessResponseInlinePreview";
import type {
    ChessResponsePattern,
    ChessResponsePreset,
} from "./chess-response/types";

export interface ChessResponseIllustrationProps {
    className?: string;
    preset?: ChessResponsePreset;
    showControls?: boolean;
    initialPattern?: ChessResponsePattern;
    initialRotation?: number;
    initialBlur?: number;
    initialContrast?: number;
    initialAnimateRotation?: boolean;
    initialShowLabels?: boolean;
    initialShowSrPairs?: boolean;
    initialShowDrPairs?: boolean;
    initialShowMrRegions?: boolean;
}

export default function ChessResponseIllustration({
    className,
    preset = "article",
    showControls = true,
    initialPattern = "corner",
    initialRotation = 22.5,
    initialBlur = 0.18,
    initialContrast = 1.08,
    initialAnimateRotation = false,
    initialShowLabels = true,
    initialShowSrPairs = true,
    initialShowDrPairs = true,
    initialShowMrRegions = true,
}: ChessResponseIllustrationProps) {
    // Compact preset delegates entirely to InlinePreview
    if (preset === "compact") {
        return (
            <ChessResponseInlinePreview
                initialPattern={initialPattern}
                initialRotation={initialRotation}
                initialBlur={initialBlur}
                initialContrast={initialContrast}
            />
        );
    }

    // Article preset — 2-column layout
    return (
        <ArticleLayout
            className={className}
            showControls={showControls}
            initialPattern={initialPattern}
            initialRotation={initialRotation}
            initialBlur={initialBlur}
            initialContrast={initialContrast}
            initialPlaying={initialAnimateRotation}
            initialShowLabels={initialShowLabels}
            initialShowSrPairs={initialShowSrPairs}
            initialShowDrPairs={initialShowDrPairs}
            initialShowMrRegions={initialShowMrRegions}
        />
    );
}

interface ArticleLayoutProps {
    className?: string;
    showControls: boolean;
    initialPattern: ChessResponsePattern;
    initialRotation: number;
    initialBlur: number;
    initialContrast: number;
    initialPlaying: boolean;
    initialShowLabels: boolean;
    initialShowSrPairs: boolean;
    initialShowDrPairs: boolean;
    initialShowMrRegions: boolean;
}

function ArticleLayout({
    className,
    showControls,
    initialPattern,
    initialRotation,
    initialBlur,
    initialContrast,
    initialPlaying,
    initialShowLabels,
    initialShowSrPairs,
    initialShowDrPairs,
    initialShowMrRegions,
}: ArticleLayoutProps) {
    const [pattern, setPattern] = useState<ChessResponsePattern>(initialPattern);
    const [rotationDeg, setRotationDeg] = useState(initialRotation);
    const [blur, setBlur] = useState(initialBlur);
    const [contrast, setContrast] = useState(initialContrast);
    const [playing, setPlaying] = useState(initialPlaying);
    const [speed, setSpeed] = useState(1);
    const [showSampleLabels, setShowSampleLabels] = useState(initialShowLabels);
    const [showSrPairs, setShowSrPairs] = useState(initialShowSrPairs);
    const [showDrPairs, setShowDrPairs] = useState(initialShowDrPairs);
    const [showMrRegions, setShowMrRegions] = useState(initialShowMrRegions);

    useChessResponseAnimation({ playing, speed, onTick: setRotationDeg });

    const response = useChessResponse({ pattern, rotationDeg, blur, contrast });

    return (
        <section
            className={classNames(
                "not-prose overflow-hidden rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] shadow-[0_24px_60px_-48px_rgba(15,23,42,0.55)]",
                className,
            )}
        >
            <div className="border-b border-border/80 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                            Interactive Figure
                        </div>
                        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                            ChESS detector response design
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                            Switch between a true corner, a plain edge, and a stripe. The pixel grid, 16-sample ring,
                            and response terms update together so the final score stays tied to the visual evidence.
                        </p>
                    </div>
                    <div className="rounded-full border border-border/80 bg-background/80 px-4 py-2 font-mono text-sm text-foreground">
                        R = SR - DR - 16 × MR
                    </div>
                </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,1fr)]">
                <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                    <ChessResponseSvg
                        patternLabel={pattern}
                        rotationDeg={rotationDeg}
                        computation={response}
                        showSampleLabels={showSampleLabels}
                        showSrPairs={showSrPairs}
                        showDrPairs={showDrPairs}
                        showMrRegions={showMrRegions}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={classNames(
                                "rounded-full border px-3 py-1.5 text-xs font-medium",
                                response.status.className,
                            )}
                        >
                            {response.status.label}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground">
                            pattern = {pattern}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground">
                            θ = {rotationDeg.toFixed(1)}°
                        </span>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
                        {response.explanation}
                    </p>
                </div>

                <aside className="border-t border-border/80 px-4 py-4 sm:px-5 sm:py-5 xl:border-l xl:border-t-0">
                    {showControls && (
                        <div className="mb-5">
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
                    )}

                    <ChessResponseReadouts response={response} showTermBreakdowns={true} />
                </aside>
            </div>
        </section>
    );
}
