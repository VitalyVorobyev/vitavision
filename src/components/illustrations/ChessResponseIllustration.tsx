import { useEffect, useState } from "react";
import { classNames } from "../../utils/helpers";
import ChessResponseSvg from "./chess-response/ChessResponseSvg";
import { useChessResponse } from "./chess-response/useChessResponse";
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

function formatValue(value: number): string {
    return value.toFixed(1);
}

function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/70 px-3 py-2.5 text-sm">
            <span className="text-foreground">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 accent-primary"
            />
        </label>
    );
}

function Range({
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
    onChange: (next: number) => void;
    formatter: (value: number) => string;
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
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-primary"
            />
        </label>
    );
}

function MetricCard({
    label,
    value,
    accentClassName,
}: {
    label: string;
    value: string;
    accentClassName?: string;
}) {
    return (
        <div className={classNames("rounded-xl border border-border/80 bg-background/80 px-3 py-3", accentClassName)}>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                {label}
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {value}
            </div>
        </div>
    );
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
    const [pattern, setPattern] = useState<ChessResponsePattern>(initialPattern);
    const [rotationDeg, setRotationDeg] = useState(initialRotation);
    const [blur, setBlur] = useState(initialBlur);
    const [contrast, setContrast] = useState(initialContrast);
    const [animateRotation, setAnimateRotation] = useState(initialAnimateRotation);
    const [showSampleLabels, setShowSampleLabels] = useState(initialShowLabels);
    const [showSrPairs, setShowSrPairs] = useState(initialShowSrPairs);
    const [showDrPairs, setShowDrPairs] = useState(initialShowDrPairs);
    const [showMrRegions, setShowMrRegions] = useState(initialShowMrRegions);

    useEffect(() => {
        if (!animateRotation) return;

        let frameId = 0;
        let previous = performance.now();

        const step = (timestamp: number) => {
            const deltaSeconds = (timestamp - previous) / 1000;
            previous = timestamp;
            setRotationDeg((current) => (current + deltaSeconds * 18) % 360);
            frameId = window.requestAnimationFrame(step);
        };

        frameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(frameId);
    }, [animateRotation]);

    const response = useChessResponse({
        pattern,
        rotationDeg,
        blur,
        contrast,
    });

    const compact = preset === "compact";

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

            <div className={classNames("grid gap-0", compact ? "" : "xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,1fr)]")}>
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

                <aside className={classNames("border-t border-border/80 px-4 py-4 sm:px-5 sm:py-5", compact ? "" : "xl:border-l xl:border-t-0")}>
                    {showControls && (
                        <div className="space-y-4">
                            <div className="space-y-2.5">
                                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                                    Pattern
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["corner", "edge", "stripe"] as ChessResponsePattern[]).map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setPattern(option)}
                                            className={classNames(
                                                "rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                                                pattern === option
                                                    ? "border-primary/30 bg-primary/10 text-foreground"
                                                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/25 px-4 py-4">
                                <Range
                                    label="Rotation"
                                    value={rotationDeg}
                                    min={0}
                                    max={360}
                                    step={0.5}
                                    onChange={setRotationDeg}
                                    formatter={(value) => `${value.toFixed(1)}°`}
                                />
                                <Range
                                    label="Blur"
                                    value={blur}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    onChange={setBlur}
                                    formatter={(value) => value.toFixed(2)}
                                />
                                <Range
                                    label="Contrast"
                                    value={contrast}
                                    min={0.65}
                                    max={1.35}
                                    step={0.01}
                                    onChange={setContrast}
                                    formatter={(value) => value.toFixed(2)}
                                />
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <Toggle
                                    label="Show sample labels"
                                    checked={showSampleLabels}
                                    onChange={setShowSampleLabels}
                                />
                                <Toggle
                                    label="Animate rotation"
                                    checked={animateRotation}
                                    onChange={setAnimateRotation}
                                />
                                <Toggle
                                    label="Show SR pairs"
                                    checked={showSrPairs}
                                    onChange={setShowSrPairs}
                                />
                                <Toggle
                                    label="Show DR pairs"
                                    checked={showDrPairs}
                                    onChange={setShowDrPairs}
                                />
                                <Toggle
                                    label="Show MR regions"
                                    checked={showMrRegions}
                                    onChange={setShowMrRegions}
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-5 space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <MetricCard label="SR" value={formatValue(response.sr)} />
                            <MetricCard label="DR" value={formatValue(response.dr)} />
                            <MetricCard label="MR" value={formatValue(response.mr)} />
                            <MetricCard
                                label="R"
                                value={formatValue(response.response)}
                                accentClassName={
                                    response.response > 0
                                        ? "border-emerald-500/30 bg-emerald-500/10"
                                        : "border-amber-500/30 bg-amber-500/10"
                                }
                            />
                        </div>

                        {!compact && (
                            <>
                                <section className="space-y-3">
                                    <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                                        Sum Response
                                    </div>
                                    <div className="grid gap-2">
                                        {response.srTerms.map((term) => (
                                            <div
                                                key={term.phase}
                                                className="rounded-xl border border-border/80 bg-background/80 px-3 py-3"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span
                                                        className="rounded-full px-2 py-0.5 text-[11px] font-mono"
                                                        style={{
                                                            color: PHASE_COLORS[term.phase],
                                                            backgroundColor: `${PHASE_COLORS[term.phase]}15`,
                                                        }}
                                                    >
                                                        φ{term.phase}
                                                    </span>
                                                    <span className="font-mono text-sm text-foreground">
                                                        {formatValue(term.value)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 font-mono text-xs leading-5 text-muted-foreground">
                                                    |(I{term.pairA[0]} + I{term.pairA[1]}) - (I{term.pairB[0]} + I{term.pairB[1]})|
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                                        Diff Response
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {response.drTerms.map((term) => (
                                            <div
                                                key={term.index}
                                                className="rounded-xl border border-border/80 bg-background/80 px-3 py-2.5"
                                            >
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    Δ{term.index} = |I{term.pair[0]} - I{term.pair[1]}|
                                                </div>
                                                <div className="mt-1 font-mono text-sm text-foreground">
                                                    {formatValue(term.value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                                        Mean Response
                                    </div>
                                    <div className="grid gap-2">
                                        <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-3">
                                            <div className="font-mono text-xs text-muted-foreground">
                                                local mean = mean(center patch)
                                            </div>
                                            <div className="mt-1 font-mono text-sm text-foreground">
                                                {formatValue(response.localMean)}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-3">
                                            <div className="font-mono text-xs text-muted-foreground">
                                                neighbor mean = mean(ring samples)
                                            </div>
                                            <div className="mt-1 font-mono text-sm text-foreground">
                                                {formatValue(response.neighborMean)}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-3">
                                            <div className="font-mono text-xs text-muted-foreground">
                                                penalty = 16 × MR
                                            </div>
                                            <div className="mt-1 font-mono text-sm text-foreground">
                                                {formatValue(16 * response.mr)}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </section>
    );
}

const PHASE_COLORS = ["#0f766e", "#2563eb", "#9333ea", "#c2410c"];
