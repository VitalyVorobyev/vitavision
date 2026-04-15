import { Pause, Play } from "lucide-react";
import { classNames } from "../../../utils/helpers";
import type { ChessResponsePattern } from "./types";

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

export interface ChessResponseControlsProps {
    pattern: ChessResponsePattern;
    onPatternChange: (pattern: ChessResponsePattern) => void;
    rotationDeg: number;
    onRotationChange: (value: number) => void;
    blur: number;
    onBlurChange: (value: number) => void;
    contrast: number;
    onContrastChange: (value: number) => void;
    showSampleLabels: boolean;
    onShowSampleLabelsChange: (value: boolean) => void;
    showSrPairs: boolean;
    onShowSrPairsChange: (value: boolean) => void;
    showDrPairs: boolean;
    onShowDrPairsChange: (value: boolean) => void;
    showMrRegions: boolean;
    onShowMrRegionsChange: (value: boolean) => void;
    playing: boolean;
    onPlayingChange: (value: boolean) => void;
    speed: number;
    onSpeedChange: (value: number) => void;
    variant?: "full" | "inline";
}

export default function ChessResponseControls({
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
    variant = "full",
}: ChessResponseControlsProps) {
    const isInline = variant === "inline";

    return (
        <div className="space-y-4">
            {/* Pattern selector */}
            <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Pattern
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {(["corner", "edge", "stripe"] as ChessResponsePattern[]).map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onPatternChange(option)}
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

            {/* Play/pause + speed */}
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
                <Range
                    label="Speed"
                    value={speed}
                    min={0.25}
                    max={4}
                    step={0.25}
                    onChange={onSpeedChange}
                    formatter={(v) => `${v.toFixed(2)}×`}
                />
            </div>

            {/* Sliders (hidden in inline variant) */}
            {!isInline && (
                <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/25 px-4 py-4">
                    <Range
                        label="Rotation"
                        value={rotationDeg}
                        min={0}
                        max={360}
                        step={0.5}
                        onChange={onRotationChange}
                        formatter={(value) => `${value.toFixed(1)}°`}
                    />
                    <Range
                        label="Blur"
                        value={blur}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={onBlurChange}
                        formatter={(value) => value.toFixed(2)}
                    />
                    <Range
                        label="Contrast"
                        value={contrast}
                        min={0.65}
                        max={1.35}
                        step={0.01}
                        onChange={onContrastChange}
                        formatter={(value) => value.toFixed(2)}
                    />
                </div>
            )}

            {/* Overlay toggles (hidden in inline variant) */}
            {!isInline && (
                <div className="space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                        Overlays
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ToggleButton
                            label="Sample labels"
                            pressed={showSampleLabels}
                            onChange={onShowSampleLabelsChange}
                        />
                        <ToggleButton
                            label="SR pairs"
                            pressed={showSrPairs}
                            onChange={onShowSrPairsChange}
                        />
                        <ToggleButton
                            label="DR pairs"
                            pressed={showDrPairs}
                            onChange={onShowDrPairsChange}
                        />
                        <ToggleButton
                            label="MR regions"
                            pressed={showMrRegions}
                            onChange={onShowMrRegionsChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
