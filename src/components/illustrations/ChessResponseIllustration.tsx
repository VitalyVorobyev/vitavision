import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { classNames } from "../../utils/helpers";
import ChessResponseSvg from "./chess-response/ChessResponseSvg";
import { useChessResponse } from "./chess-response/useChessResponse";
import useChessResponseAnimation from "./chess-response/useChessResponseAnimation";
import ChessResponseInlinePreview from "./ChessResponseInlinePreview";
import { PHASE_COLORS, formatValue } from "./chess-response/readoutHelpers";
import type {
    ChessResponsePattern,
    ChessResponsePreset,
} from "./chess-response/types";
import type { useChessResponse as UseChessResponse } from "./chess-response/useChessResponse";

// ---------------------------------------------------------------------------
// Inline Controls (replaces deleted ChessResponseControls.tsx)
// ---------------------------------------------------------------------------
function ToggleButton({
    label,
    pressed,
    onChange,
}: {
    label: string;
    pressed: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(!pressed)}
            className={classNames(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors text-left",
                pressed
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
            )}
        >
            {label}
        </button>
    );
}

function RangeRow({
    label,
    value,
    min,
    max,
    step,
    onChange,
    formatter,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    formatter: (v: number) => string;
}) {
    return (
        <label className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{label}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatter(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-primary"
            />
        </label>
    );
}

interface ArticleControlsProps {
    pattern: ChessResponsePattern;
    onPatternChange: (p: ChessResponsePattern) => void;
    rotationDeg: number;
    onRotationChange: (v: number) => void;
    blur: number;
    onBlurChange: (v: number) => void;
    contrast: number;
    onContrastChange: (v: number) => void;
    showSampleLabels: boolean;
    onShowSampleLabelsChange: (v: boolean) => void;
    showSrPairs: boolean;
    onShowSrPairsChange: (v: boolean) => void;
    showDrPairs: boolean;
    onShowDrPairsChange: (v: boolean) => void;
    showMrRegions: boolean;
    onShowMrRegionsChange: (v: boolean) => void;
    playing: boolean;
    onPlayingChange: (v: boolean) => void;
    speed: number;
    onSpeedChange: (v: number) => void;
}

function ArticleControls({
    pattern,
    onPatternChange,
    rotationDeg,
    onRotationChange,
    blur,
    onBlurChange,
    contrast,
    onContrastChange,
    showSampleLabels,
    onShowSampleLabelsChange,
    showSrPairs,
    onShowSrPairsChange,
    showDrPairs,
    onShowDrPairsChange,
    showMrRegions,
    onShowMrRegionsChange,
    playing,
    onPlayingChange,
    speed,
    onSpeedChange,
}: ArticleControlsProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Pattern
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {(["corner", "edge", "stripe"] as ChessResponsePattern[]).map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onPatternChange(opt)}
                            className={classNames(
                                "rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                                pattern === opt
                                    ? "border-primary/30 bg-primary/10 text-foreground"
                                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Animation
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label={playing ? "Pause rotation" : "Play rotation"}
                        onClick={() => onPlayingChange(!playing)}
                        className={classNames(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                            playing
                                ? "border-primary/30 bg-primary/10 text-foreground"
                                : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {playing ? "Pause" : "Play"}
                    </button>
                </div>
                <RangeRow
                    label="Speed"
                    value={speed}
                    min={0.25}
                    max={4}
                    step={0.25}
                    onChange={onSpeedChange}
                    formatter={(v) => `${v.toFixed(2)}×`}
                />
            </div>

            <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/25 px-4 py-4">
                <RangeRow
                    label="Rotation"
                    value={rotationDeg}
                    min={0}
                    max={360}
                    step={0.5}
                    onChange={onRotationChange}
                    formatter={(v) => `${v.toFixed(1)}°`}
                />
                <RangeRow
                    label="Blur"
                    value={blur}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={onBlurChange}
                    formatter={(v) => v.toFixed(2)}
                />
                <RangeRow
                    label="Contrast"
                    value={contrast}
                    min={0.65}
                    max={1.35}
                    step={0.01}
                    onChange={onContrastChange}
                    formatter={(v) => v.toFixed(2)}
                />
            </div>

            <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Overlays
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <ToggleButton label="Sample labels" pressed={showSampleLabels} onChange={onShowSampleLabelsChange} />
                    <ToggleButton label="SR pairs" pressed={showSrPairs} onChange={onShowSrPairsChange} />
                    <ToggleButton label="DR pairs" pressed={showDrPairs} onChange={onShowDrPairsChange} />
                    <ToggleButton label="MR regions" pressed={showMrRegions} onChange={onShowMrRegionsChange} />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inline Readouts (replaces deleted ChessResponseReadouts.tsx)
// ---------------------------------------------------------------------------
function MetricChip({
    label,
    value,
    accentClassName,
}: {
    label: string;
    value: string;
    accentClassName?: string;
}) {
    return (
        <div
            className={classNames(
                "flex flex-col items-center justify-center rounded-lg border border-border/80 bg-background/80 px-2 py-1.5 min-w-0",
                accentClassName,
            )}
        >
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground leading-none">
                {label}
            </div>
            <div className="mt-1 font-mono text-sm font-semibold tracking-tight text-foreground leading-none truncate">
                {value}
            </div>
        </div>
    );
}

function ArticleReadouts({ response }: { response: ReturnType<typeof UseChessResponse> }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-1.5">
                <MetricChip label="SR" value={formatValue(response.sr)} />
                <MetricChip label="DR" value={formatValue(response.dr)} />
                <MetricChip label="MR" value={formatValue(response.mr)} />
                <MetricChip
                    label="R"
                    value={formatValue(response.response)}
                    accentClassName={
                        response.response > 0
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }
                />
            </div>

            <section className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    Sum Response
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {response.srTerms.map((term) => (
                        <div
                            key={term.phase}
                            className="rounded-md border border-border/80 bg-background/80 px-2 py-1.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className="rounded-full px-1.5 py-0 text-[10px] font-mono"
                                    style={{
                                        color: PHASE_COLORS[term.phase],
                                        backgroundColor: `${PHASE_COLORS[term.phase]}15`,
                                    }}
                                >
                                    φ{term.phase}
                                </span>
                                <span className="font-mono text-xs text-foreground">
                                    {formatValue(term.value)}
                                </span>
                            </div>
                            <div className="mt-1 font-mono text-[10px] leading-4 text-muted-foreground truncate">
                                |(I{term.pairA[0]}+I{term.pairA[1]})−(I{term.pairB[0]}+I{term.pairB[1]})|
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    Diff Response
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {response.drTerms.map((term) => (
                        <div
                            key={term.index}
                            className="rounded-md border border-border/80 bg-background/80 px-2 py-1 flex items-center justify-between gap-2"
                        >
                            <span className="font-mono text-[10px] text-muted-foreground">
                                Δ{term.index} |I{term.pair[0]}−I{term.pair[1]}|
                            </span>
                            <span className="font-mono text-xs text-foreground">
                                {formatValue(term.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    Mean Response
                </div>
                <div className="rounded-md border border-border/80 bg-background/80 divide-y divide-border/60">
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">local mean (center patch)</span>
                        <span className="font-mono text-xs text-foreground">{formatValue(response.localMean)}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">ring mean</span>
                        <span className="font-mono text-xs text-foreground">{formatValue(response.neighborMean)}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">penalty = 16·MR</span>
                        <span className="font-mono text-xs text-foreground">{formatValue(16 * response.mr)}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
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
                            <ArticleControls
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
                            />
                        </div>
                    )}

                    <ArticleReadouts response={response} />
                </aside>
            </div>
        </section>
    );
}
