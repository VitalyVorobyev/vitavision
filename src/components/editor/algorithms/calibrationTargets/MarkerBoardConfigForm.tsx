import { NumberField, Section } from "../formFields";
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
    const { config, onChange, disabled } = props;

    const set = <K extends keyof MarkerBoardConfig>(key: K, value: MarkerBoardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board">
                <NumberField
                    label="Rows"
                    value={config.boardRows}
                    onChange={(v) => set("boardRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cols"
                    value={config.boardCols}
                    onChange={(v) => set("boardCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
            </Section>
            <Section title="Chessboard detector">
                <NumberField
                    label="Expected rows"
                    value={config.expectedRows}
                    onChange={(v) => set("expectedRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Expected cols"
                    value={config.expectedCols}
                    onChange={(v) => set("expectedCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Min corner strength"
                    value={config.minCornerStrength}
                    onChange={(v) => set("minCornerStrength", v ?? 0.2)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <NumberField
                    label="Completeness threshold"
                    value={config.completenessThreshold}
                    onChange={(v) => set("completenessThreshold", v ?? 0.05)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
            </Section>
            <Section title="Grid graph">
                <NumberField
                    label="Min spacing (px)"
                    value={config.graphMinSpacingPix}
                    onChange={(v) => set("graphMinSpacingPix", v ?? 40)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Max spacing (px)"
                    value={config.graphMaxSpacingPix}
                    onChange={(v) => set("graphMaxSpacingPix", v ?? 160)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="K neighbors"
                    value={config.graphKNeighbors}
                    onChange={(v) => set("graphKNeighbors", v ?? 8)}
                    disabled={disabled}
                    min={1}
                    max={64}
                    step={1}
                />
                <NumberField
                    label="Orientation tolerance (°)"
                    value={config.graphOrientationToleranceDeg}
                    onChange={(v) => set("graphOrientationToleranceDeg", v ?? 22.5)}
                    disabled={disabled}
                    min={0}
                    max={180}
                    step={0.5}
                />
            </Section>
            <Section title="Circle score">
                <NumberField
                    label="Patch size (px)"
                    value={config.circleScorePatchSize}
                    onChange={(v) => set("circleScorePatchSize", v ?? 64)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Diameter fraction"
                    value={config.circleScoreDiameterFrac}
                    onChange={(v) => set("circleScoreDiameterFrac", v ?? 0.5)}
                    disabled={disabled}
                    min={0.01}
                    max={2}
                    step={0.05}
                />
                <NumberField
                    label="Ring thickness fraction"
                    value={config.circleScoreRingThicknessFrac}
                    onChange={(v) => set("circleScoreRingThicknessFrac", v ?? 0.35)}
                    disabled={disabled}
                    min={0.01}
                    max={2}
                    step={0.05}
                />
                <NumberField
                    label="Ring radius multiplier"
                    value={config.circleScoreRingRadiusMul}
                    onChange={(v) => set("circleScoreRingRadiusMul", v ?? 1.6)}
                    disabled={disabled}
                    min={0.01}
                    max={10}
                    step={0.1}
                />
                <NumberField
                    label="Min contrast"
                    value={config.circleScoreMinContrast}
                    onChange={(v) => set("circleScoreMinContrast", v ?? 10)}
                    disabled={disabled}
                    min={0}
                    step={1}
                />
                <NumberField
                    label="Samples"
                    value={config.circleScoreSamples}
                    onChange={(v) => set("circleScoreSamples", v ?? 48)}
                    disabled={disabled}
                    min={1}
                    max={1024}
                    step={1}
                />
                <NumberField
                    label="Center search (px)"
                    value={config.circleScoreCenterSearchPx}
                    onChange={(v) => set("circleScoreCenterSearchPx", v ?? 2)}
                    disabled={disabled}
                    min={0}
                    max={256}
                    step={1}
                />
            </Section>
        </>
    );
};

export default MarkerBoardConfigForm;
