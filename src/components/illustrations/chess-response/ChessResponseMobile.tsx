import { Pause, Play } from "lucide-react";
import { Button, SegmentedControl, Slider, ToggleChip } from "@vitavision/ui";
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
import { PATTERN_OPTIONS, toPattern } from "./patternOptions";
import { CHESS_DR_COLOR, CHESS_MR_COLOR, CHESS_PHASE_COLORS } from "../_shared/dataColors";

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
            <div className="mb-1 text-xs text-fg">{label}</div>
            <Slider
                aria-label={label}
                value={value}
                min={min}
                max={max}
                step={step}
                onValueChange={onChange}
                readout={<span className="inline-block w-12 text-right text-[11px] text-fg-muted">{display}</span>}
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
                                ? "border-normal/30 bg-normal/10 text-normal"
                                : "border-warn/30 bg-warn/10 text-warn",
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
                <SegmentedControl
                    aria-label="Pattern"
                    className="w-full [&>label]:flex-1 [&>label]:py-2 [&>label]:text-center [&>label]:text-sm"
                    value={pattern}
                    options={PATTERN_OPTIONS}
                    onValueChange={(next) => {
                        const p = toPattern(next);
                        if (p) onPatternChange(p);
                    }}
                />
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
            <Button
                variant={playing ? "secondary" : "primary"}
                className="h-11 w-full"
                aria-label={playing ? "Pause rotation" : "Play rotation"}
                onClick={() => onPlayingChange(!playing)}
                icon={playing ? <Pause /> : <Play />}
            >
                {playing ? "Pause" : "Play rotation"}
            </Button>

            {/* 6. Overlays — collapsible details */}
            <details className="rounded-xl border border-line bg-surface overflow-hidden">
                <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer list-none select-none">
                    <span className="text-sm font-medium">Overlays</span>
                    <span className="text-[11px] text-fg-muted">4 toggles ▾</span>
                </summary>
                <div className="flex flex-wrap gap-1.5 px-3 pb-3">
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
            </details>
        </div>
    );
}
