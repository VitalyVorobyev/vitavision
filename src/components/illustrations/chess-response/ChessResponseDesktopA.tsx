import { useState } from "react";
import { Pause, Play } from "lucide-react";
import ChessResponseSvg from "./ChessResponseSvg";
import { formatValue } from "./readoutHelpers";
import {
    FloatingPanel,
    MetricCell,
    TinyBrow,
} from "../_shared/primitives";
import type { ChessDemoProps } from "./ChessDemoProps";
import type { ChessResponsePattern } from "./types";

const PATTERNS: ChessResponsePattern[] = ["corner", "edge", "stripe"];

function SliderRow({
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
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">{label}</span>
                <span className="text-[11px] font-mono text-muted-foreground">{display}</span>
            </div>
            {/* custom styled track */}
            <div className="relative h-1 rounded-full bg-[hsl(222_18%_22%)]">
                <div
                    className="absolute left-0 top-0 h-1 rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-primary"
                    style={{ left: `${pct}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    aria-label={label}
                />
            </div>
        </div>
    );
}

function OverlayToggle({
    label,
    pressed,
    onChange,
}: {
    label: string;
    pressed: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(!pressed)}
            className={[
                "rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors text-center",
                pressed
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
            ].join(" ")}
        >
            {label}
        </button>
    );
}

export default function ChessResponseDesktopA({
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
    const [inspectorOpen, setInspectorOpen] = useState(true);

    const rTone = response.response > 0 ? "good" : "warn";

    return (
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 py-2 space-y-4">
            {/* Hero canvas panel */}
            <div
                className="rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] p-3.5 relative overflow-hidden"
                style={{ minHeight: 480 }}
            >
                {/* SVG canvas centred */}
                <div className="flex justify-center items-center py-2">
                    <div className="w-full max-w-[720px]">
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
                </div>

                {/* Floating Inspector — top right */}
                <FloatingPanel className="absolute top-4 right-4 w-[280px] p-3.5">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2.5">
                        <TinyBrow>Inspector</TinyBrow>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                aria-label={inspectorOpen ? "Collapse inspector" : "Expand inspector"}
                                onClick={() => setInspectorOpen((v) => !v)}
                                className="rounded-lg border border-border/80 bg-background/80 px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {inspectorOpen ? "—" : "+"}
                            </button>
                        </div>
                    </div>

                    {inspectorOpen && (
                        <div className="space-y-3.5">
                            <SliderRow
                                label="Blur"
                                value={blur}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={onBlurChange}
                                display={blur.toFixed(2)}
                            />
                            <SliderRow
                                label="Contrast"
                                value={contrast}
                                min={0.65}
                                max={1.35}
                                step={0.01}
                                onChange={onContrastChange}
                                display={contrast.toFixed(2)}
                            />

                            <div>
                                <TinyBrow className="block mb-1.5">Overlays</TinyBrow>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <OverlayToggle
                                        label="Samples"
                                        pressed={showSampleLabels}
                                        onChange={onShowSampleLabelsChange}
                                    />
                                    <OverlayToggle
                                        label="SR"
                                        pressed={showSrPairs}
                                        onChange={onShowSrPairsChange}
                                    />
                                    <OverlayToggle
                                        label="DR"
                                        pressed={showDrPairs}
                                        onChange={onShowDrPairsChange}
                                    />
                                    <OverlayToggle
                                        label="MR"
                                        pressed={showMrRegions}
                                        onChange={onShowMrRegionsChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </FloatingPanel>

                {/* HUD readout — bottom left */}
                <FloatingPanel className="absolute left-4 bottom-[60px] w-[220px] p-2.5">
                    <TinyBrow className="block mb-2">Live response</TinyBrow>
                    <div className="grid grid-cols-2 gap-1.5">
                        <MetricCell label="SR" value={formatValue(response.sr)} />
                        <MetricCell label="DR" value={formatValue(response.dr)} />
                        <MetricCell label="MR" value={formatValue(response.mr)} />
                        <MetricCell label="R" value={formatValue(response.response)} tone={rTone} />
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                        R = SR − DR − 16·MR
                    </div>
                </FloatingPanel>

                {/* Bottom dock — centered */}
                <FloatingPanel className="absolute left-1/2 bottom-3.5 -translate-x-1/2 flex items-center gap-2.5 px-2 py-1.5 rounded-full">
                    {/* Pattern segmented */}
                    <div className="flex gap-1">
                        {PATTERNS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => onPatternChange(p)}
                                className={[
                                    "rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                                    pattern === p
                                        ? "border-primary/30 bg-primary/10 text-foreground"
                                        : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
                                ].join(" ")}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 bg-border" />

                    {/* Play / Pause */}
                    <button
                        type="button"
                        aria-label={playing ? "Pause rotation" : "Play rotation"}
                        onClick={() => onPlayingChange(!playing)}
                        className={[
                            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            playing
                                ? "border-primary/30 bg-primary/10 text-foreground"
                                : "border-border/80 bg-primary text-background hover:bg-primary/90",
                        ].join(" ")}
                    >
                        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {playing ? "Pause" : "Play"}
                    </button>

                    {/* θ scrub slider */}
                    <input
                        type="range"
                        min={0}
                        max={360}
                        step={0.5}
                        value={rotationDeg}
                        onChange={(e) => onRotationChange(Number(e.target.value))}
                        className="w-[220px] accent-primary"
                        aria-label="Rotation angle"
                    />

                    {/* θ readout */}
                    <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        θ = {rotationDeg.toFixed(1)}°
                    </span>
                </FloatingPanel>
            </div>
        </div>
    );
}
