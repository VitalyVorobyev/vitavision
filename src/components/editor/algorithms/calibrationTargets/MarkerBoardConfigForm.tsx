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
    const { config, onChange, disabled, modal } = props;
    const cols = modal ? 2 : undefined;

    const set = <K extends keyof MarkerBoardConfig>(key: K, value: MarkerBoardConfig[K]) =>
        onChange({ ...config, [key]: value });

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
            <Section title="Chessboard detector" columns={cols}>
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
            </Section>
            <Section title="Grid graph" columns={cols}>
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
            </Section>
            <Section title="Circle score" columns={cols}>
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
            </Section>
        </>
    );
};

export default MarkerBoardConfigForm;
