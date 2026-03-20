import { useState } from "react";
import { X, Plus } from "lucide-react";
import { CollapsibleSection, NumberField, Section } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";
import type { MarkerCircleSpec } from "../../../../lib/api";

export interface MarkerBoardConfig {
    boardRows: number;
    boardCols: number;
    circles: MarkerCircleSpec[];
    expectedRows: number;
    expectedCols: number;
    minCornerStrength: number;
    completenessThreshold: number;
    // Grid graph sub-params
    graphMinSpacingPix: number;
    graphMaxSpacingPix: number;
    graphKNeighbors: number;
    graphOrientationToleranceDeg: number;
    // Circle score sub-params
    circleScorePatchSize: number;
    circleScoreDiameterFrac: number;
    circleScoreRingThicknessFrac: number;
    circleScoreRingRadiusMul: number;
    circleScoreMinContrast: number;
    circleScoreSamples: number;
    circleScoreCenterSearchPx: number;
}

const MarkerBoardConfigForm = (props: AlgorithmConfigFormProps<MarkerBoardConfig>) => {
    const { config, onChange, disabled, modal } = props;
    const cols = modal ? 2 : undefined;
    const [newI, setNewI] = useState(0);
    const [newJ, setNewJ] = useState(0);
    const [newPolarity, setNewPolarity] = useState<"white" | "black">("white");

    const set = <K extends keyof MarkerBoardConfig>(key: K, value: MarkerBoardConfig[K]) =>
        onChange({ ...config, [key]: value });

    const removeCircle = (index: number) =>
        onChange({ ...config, circles: config.circles.filter((_, idx) => idx !== index) });

    const addCircle = () => {
        const exists = config.circles.some((c) => c.i === newI && c.j === newJ);
        if (exists) return;
        onChange({ ...config, circles: [...config.circles, { i: newI, j: newJ, polarity: newPolarity }] });
    };

    return (
        <>
            <Section title="Board" columns={cols}>
                <NumberField
                    label="Rows"
                    tooltip="Total number of rows of squares on the marker board."
                    value={config.boardRows}
                    onChange={(v) => set("boardRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cols"
                    tooltip="Total number of columns of squares on the marker board."
                    value={config.boardCols}
                    onChange={(v) => set("boardCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
            </Section>
            <Section title="Expected circles">
                <div className="space-y-1.5">
                    {config.circles.map((c, idx) => (
                        <div key={`${c.i}-${c.j}`} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-muted-foreground">
                                ({c.i}, {c.j})
                            </span>
                            <span className="text-muted-foreground">{c.polarity}</span>
                            <button
                                type="button"
                                onClick={() => removeCircle(idx)}
                                disabled={disabled}
                                className="ml-auto p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove circle"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    {config.circles.length === 0 && (
                        <p className="text-[11px] text-muted-foreground italic">No circles defined</p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                    <input
                        type="number"
                        value={newI}
                        onChange={(e) => setNewI(Number(e.target.value))}
                        disabled={disabled}
                        className="w-12 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                        placeholder="i"
                        min={0}
                    />
                    <input
                        type="number"
                        value={newJ}
                        onChange={(e) => setNewJ(Number(e.target.value))}
                        disabled={disabled}
                        className="w-12 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                        placeholder="j"
                        min={0}
                    />
                    <select
                        value={newPolarity}
                        onChange={(e) => setNewPolarity(e.target.value as "white" | "black")}
                        disabled={disabled}
                        className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                    >
                        <option value="white">white</option>
                        <option value="black">black</option>
                    </select>
                    <button
                        type="button"
                        onClick={addCircle}
                        disabled={disabled}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        title="Add circle"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </Section>
            <CollapsibleSection title="Chessboard detector" columns={cols}>
                <NumberField
                    label="Expected rows"
                    tooltip="Number of internal corner rows expected (squares minus one)."
                    value={config.expectedRows}
                    onChange={(v) => set("expectedRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Expected cols"
                    tooltip="Number of internal corner columns expected (squares minus one)."
                    value={config.expectedCols}
                    onChange={(v) => set("expectedCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Min corner strength"
                    tooltip="Minimum ChESS response threshold (0-1). Lower detects weaker corners but increases false positives."
                    value={config.minCornerStrength}
                    onChange={(v) => set("minCornerStrength", v ?? 0.2)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <NumberField
                    label="Completeness threshold"
                    tooltip="Fraction of expected corners that must be detected for the board to be accepted."
                    value={config.completenessThreshold}
                    onChange={(v) => set("completenessThreshold", v ?? 0.05)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Grid graph" columns={cols}>
                <NumberField
                    label="Min spacing (px)"
                    tooltip="Minimum distance between adjacent corners in pixels."
                    value={config.graphMinSpacingPix}
                    onChange={(v) => set("graphMinSpacingPix", v ?? 20)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Max spacing (px)"
                    tooltip="Maximum distance between adjacent corners in pixels."
                    value={config.graphMaxSpacingPix}
                    onChange={(v) => set("graphMaxSpacingPix", v ?? 160)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="K neighbors"
                    tooltip="Number of nearest neighbors for graph construction. Higher handles irregular boards better."
                    value={config.graphKNeighbors}
                    onChange={(v) => set("graphKNeighbors", v ?? 8)}
                    disabled={disabled}
                    min={1}
                    max={64}
                    step={1}
                />
                <NumberField
                    label="Orientation tolerance (°)"
                    tooltip="Maximum angle deviation from grid directions when connecting corners."
                    value={config.graphOrientationToleranceDeg}
                    onChange={(v) => set("graphOrientationToleranceDeg", v ?? 12.5)}
                    disabled={disabled}
                    min={0}
                    max={180}
                    step={0.5}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Circle score" columns={cols}>
                <NumberField
                    label="Patch size (px)"
                    tooltip="Size of the image patch extracted around each candidate circle for scoring."
                    value={config.circleScorePatchSize}
                    onChange={(v) => set("circleScorePatchSize", v ?? 64)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Diameter fraction"
                    tooltip="Expected circle diameter as a fraction of the patch size."
                    value={config.circleScoreDiameterFrac}
                    onChange={(v) => set("circleScoreDiameterFrac", v ?? 0.5)}
                    disabled={disabled}
                    min={0.01}
                    max={2}
                    step={0.05}
                />
                <NumberField
                    label="Ring thickness fraction"
                    tooltip="Thickness of the scoring ring as a fraction of the circle radius."
                    value={config.circleScoreRingThicknessFrac}
                    onChange={(v) => set("circleScoreRingThicknessFrac", v ?? 0.35)}
                    disabled={disabled}
                    min={0.01}
                    max={2}
                    step={0.05}
                />
                <NumberField
                    label="Ring radius multiplier"
                    tooltip="Multiplier for the outer scoring ring radius relative to the circle edge."
                    value={config.circleScoreRingRadiusMul}
                    onChange={(v) => set("circleScoreRingRadiusMul", v ?? 1.6)}
                    disabled={disabled}
                    min={0.01}
                    max={10}
                    step={0.1}
                />
                <NumberField
                    label="Min contrast"
                    tooltip="Minimum intensity contrast between circle and background to accept a candidate."
                    value={config.circleScoreMinContrast}
                    onChange={(v) => set("circleScoreMinContrast", v ?? 10)}
                    disabled={disabled}
                    min={0}
                    step={1}
                />
                <NumberField
                    label="Samples"
                    tooltip="Number of angular samples taken along the scoring ring."
                    value={config.circleScoreSamples}
                    onChange={(v) => set("circleScoreSamples", v ?? 48)}
                    disabled={disabled}
                    min={1}
                    max={1024}
                    step={1}
                />
                <NumberField
                    label="Center search (px)"
                    tooltip="Pixel radius for subpixel circle center refinement search."
                    value={config.circleScoreCenterSearchPx}
                    onChange={(v) => set("circleScoreCenterSearchPx", v ?? 2)}
                    disabled={disabled}
                    min={0}
                    max={256}
                    step={1}
                />
            </CollapsibleSection>
        </>
    );
};

export default MarkerBoardConfigForm;
