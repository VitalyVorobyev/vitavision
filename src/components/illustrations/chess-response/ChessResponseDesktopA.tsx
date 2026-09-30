import { useState } from "react";
import { Minus, Pause, Play, Plus } from "lucide-react";
import { Button, DensityProvider, SegmentedControl, Slider, ToggleChip } from "@vitavision/ui";
import ChessResponseSvg from "./ChessResponseSvg";
import { formatValue } from "./readoutHelpers";
import {
    FloatingPanel,
    MetricCell,
    TinyBrow,
} from "../_shared/primitives";
import type { ChessDemoProps } from "./ChessDemoProps";
import { PATTERN_OPTIONS, toPattern } from "./patternOptions";
import { CHESS_DR_COLOR, CHESS_MR_COLOR, CHESS_PHASE_COLORS } from "../_shared/dataColors";

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
    return (
        <div>
            <div className="mb-1 text-xs text-fg">{label}</div>
            <Slider
                aria-label={label}
                value={value}
                min={min}
                max={max}
                step={step}
                onValueChange={onChange}
                readout={<span className="inline-block w-9 text-right text-[11px] text-fg-muted">{display}</span>}
            />
        </div>
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
        <DensityProvider value="compact">
        <div className="w-full max-w-screen-2xl mx-auto px-4 lg:px-8 py-2 space-y-4">
            {/* Hero canvas panel */}
            <div
                className="rounded-[1.5rem] border border-line bg-[linear-gradient(180deg,var(--surface),var(--ground))] p-3.5 relative overflow-hidden"
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
                            <Button
                                variant="ghost"
                                className="h-6 px-1.5"
                                aria-label={inspectorOpen ? "Collapse inspector" : "Expand inspector"}
                                aria-expanded={inspectorOpen}
                                onClick={() => setInspectorOpen((v) => !v)}
                                icon={inspectorOpen ? <Minus /> : <Plus />}
                            />
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
                                <div className="flex flex-wrap gap-1.5">
                                    <ToggleChip checked={showSampleLabels} onCheckedChange={onShowSampleLabelsChange}>
                                        Samples
                                    </ToggleChip>
                                    <ToggleChip checked={showSrPairs} onCheckedChange={onShowSrPairsChange} swatch={CHESS_PHASE_COLORS[1]}>
                                        SR
                                    </ToggleChip>
                                    <ToggleChip checked={showDrPairs} onCheckedChange={onShowDrPairsChange} swatch={CHESS_DR_COLOR}>
                                        DR
                                    </ToggleChip>
                                    <ToggleChip checked={showMrRegions} onCheckedChange={onShowMrRegionsChange} swatch={CHESS_MR_COLOR}>
                                        MR
                                    </ToggleChip>
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
                    <div className="mt-2 font-mono text-[10px] text-fg-muted">
                        R = SR − DR − 16·MR
                    </div>
                </FloatingPanel>

                {/* Bottom dock — centered */}
                <FloatingPanel className="absolute left-1/2 bottom-3.5 -translate-x-1/2 flex items-center gap-2.5 px-2 py-1.5 rounded-full">
                    {/* Pattern segmented */}
                    <SegmentedControl
                        aria-label="Pattern"
                        value={pattern}
                        options={PATTERN_OPTIONS}
                        onValueChange={(next) => {
                            const p = toPattern(next);
                            if (p) onPatternChange(p);
                        }}
                    />

                    {/* Divider */}
                    <div className="w-px h-5 bg-line" />

                    {/* Play / Pause */}
                    <Button
                        variant={playing ? "secondary" : "primary"}
                        aria-label={playing ? "Pause rotation" : "Play rotation"}
                        onClick={() => onPlayingChange(!playing)}
                        icon={playing ? <Pause /> : <Play />}
                    >
                        {playing ? "Pause" : "Play"}
                    </Button>

                    {/* θ scrub slider */}
                    <Slider
                        aria-label="Rotation angle"
                        className="w-[220px] flex-none"
                        value={rotationDeg}
                        min={0}
                        max={360}
                        step={0.5}
                        onValueChange={onRotationChange}
                    />

                    {/* θ readout */}
                    <span className="font-mono text-[11px] text-fg-muted whitespace-nowrap">
                        θ = {rotationDeg.toFixed(1)}°
                    </span>
                </FloatingPanel>
            </div>
        </div>
        </DensityProvider>
    );
}
