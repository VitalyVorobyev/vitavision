import { Pause, Play } from "lucide-react";
import ChessResponseSvg from "./ChessResponseSvg";
import { formatValue } from "./readoutHelpers";
import {
    MetricCell,
    Panel,
    PanelFlat,
    Pill,
    TinyBrow,
} from "../_shared/primitives";
import type { ChessDemoProps } from "./ChessDemoProps";
import type { ChessResponsePattern } from "./types";

const PATTERNS: ChessResponsePattern[] = ["corner", "edge", "stripe"];

function MobileSliderRow({
    label,
    value,
    min,
    max,
    step,
    onChange,
    display,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    display: string;
}) {
    return (
        <div className="mb-2.5 last:mb-0">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">{label}</span>
                <span className="text-[11px] font-mono text-muted-foreground">{display}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={label}
                className={[
                    "w-full accent-primary appearance-none bg-[hsl(222_18%_22%)] h-1.5 rounded-full",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px]",
                    "[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full",
                    "[&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2",
                    "[&::-webkit-slider-thumb]:border-primary",
                    "[&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px]",
                    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground",
                    "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary",
                ].join(" ")}
            />
        </div>
    );
}

export default function ChessResponseMobile({
    pattern,
    onPatternChange,
    rotationDeg,
    onRotationChange,
    blur,
    onBlurChange,
    contrast,
    onContrastChange,
    playing,
    onPlayingChange,
    showSampleLabels,
    onShowSampleLabelsChange,
    showSrPairs,
    onShowSrPairsChange,
    showDrPairs,
    onShowDrPairsChange,
    showMrRegions,
    onShowMrRegionsChange,
    response,
}: ChessDemoProps) {
    const rTone = response.response > 0 ? "good" : "warn";

    // Status pill styling mirrors responseStatus className from math.ts
    const statusIsPositive = response.response > 0;

    return (
        <div className="flex flex-col gap-3 px-3 pb-7">
            {/* 1. Canvas panel */}
            <Panel className="p-2">
                <ChessResponseSvg
                    patternLabel={pattern}
                    rotationDeg={rotationDeg}
                    computation={response}
                    showSampleLabels={showSampleLabels}
                    showSrPairs={showSrPairs}
                    showDrPairs={showDrPairs}
                    showMrRegions={showMrRegions}
                />
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    <span
                        className={[
                            "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium",
                            statusIsPositive
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                        ].join(" ")}
                    >
                        {response.status.label}
                    </span>
                    <Pill>θ = {rotationDeg.toFixed(1)}°</Pill>
                </div>
            </Panel>

            {/* 2. Metric chip strip */}
            <div className="grid grid-cols-4 gap-1.5">
                <MetricCell label="SR" value={formatValue(response.sr)} />
                <MetricCell label="DR" value={formatValue(response.dr)} />
                <MetricCell label="MR" value={formatValue(response.mr)} />
                <MetricCell label="R" value={formatValue(response.response)} tone={rTone} />
            </div>

            {/* 3. Pattern segmented */}
            <div>
                <TinyBrow className="block mb-1.5">Pattern</TinyBrow>
                <div className="grid grid-cols-3 gap-2">
                    {PATTERNS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPatternChange(p)}
                            className={[
                                "min-h-[44px] rounded-xl border text-sm font-medium capitalize transition-colors",
                                pattern === p
                                    ? "border-primary/30 bg-primary/10 text-foreground"
                                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. Sliders card */}
            <PanelFlat className="p-3">
                <MobileSliderRow
                    label="Rotation"
                    value={rotationDeg}
                    min={0}
                    max={360}
                    step={0.5}
                    onChange={onRotationChange}
                    display={`${rotationDeg.toFixed(1)}°`}
                />
                <MobileSliderRow
                    label="Blur"
                    value={blur}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={onBlurChange}
                    display={blur.toFixed(2)}
                />
                <MobileSliderRow
                    label="Contrast"
                    value={contrast}
                    min={0.65}
                    max={1.35}
                    step={0.01}
                    onChange={onContrastChange}
                    display={contrast.toFixed(2)}
                />
            </PanelFlat>

            {/* 5. Play / Pause button */}
            <button
                type="button"
                aria-label={playing ? "Pause rotation" : "Play rotation"}
                onClick={() => onPlayingChange(!playing)}
                className={[
                    "min-h-[44px] w-full flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                    playing
                        ? "border-primary/50 bg-primary/20 text-foreground"
                        : "border-primary/30 bg-primary text-background hover:bg-primary/90",
                ].join(" ")}
            >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "▶ Play rotation"}
            </button>

            {/* 6. Overlays — collapsible details */}
            <details className="rounded-xl border border-border bg-surface overflow-hidden">
                <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer list-none select-none">
                    <span className="text-sm font-medium">Overlays</span>
                    <span className="text-[11px] text-muted-foreground">4 toggles ▾</span>
                </summary>
                <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                    {(
                        [
                            { label: "Samples", pressed: showSampleLabels, onChange: onShowSampleLabelsChange },
                            { label: "SR", pressed: showSrPairs, onChange: onShowSrPairsChange },
                            { label: "DR", pressed: showDrPairs, onChange: onShowDrPairsChange },
                            { label: "MR", pressed: showMrRegions, onChange: onShowMrRegionsChange },
                        ] as const
                    ).map(({ label, pressed, onChange }) => (
                        <button
                            key={label}
                            type="button"
                            aria-pressed={pressed}
                            onClick={() => onChange(!pressed)}
                            className={[
                                "min-h-[40px] rounded-xl border text-sm font-medium transition-colors",
                                pressed
                                    ? "border-primary/30 bg-primary/10 text-foreground"
                                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </details>
        </div>
    );
}
