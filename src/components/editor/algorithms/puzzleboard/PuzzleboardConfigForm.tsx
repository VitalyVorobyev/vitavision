import { CheckboxField, CollapsibleSection, NumberField, Section, SelectField, type FieldOption } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface PuzzleboardConfig {
    boardRows: number;
    boardCols: number;
    cellSize: number;
    originRow: number;
    originCol: number;
    pxPerSquare: number;
    decodeMinWindow: number;
    decodeMinBitConfidence: number;
    decodeMaxBitErrorRate: number;
    decodeSampleRadiusRel: number;
    decodeSearchAllComponents: boolean;
    chessMinCornerStrength: number;
    chessCompletenessThreshold: number;
    graphMinSpacingPix: number;
    graphMaxSpacingPix: number;
    decodeSearchMode: "full" | "fixed_board";
    decodeScoringMode: "hard_weighted" | "soft_log_likelihood";
    decodeBitLikelihoodSlope: number;
    decodePerBitFloor: number;
    decodeAlignmentMinMargin: number;
}

const searchModeOptions: FieldOption<"fixed_board" | "full">[] = [
    { value: "fixed_board", label: "Fixed board" },
    { value: "full", label: "Full scan" },
];

const scoringModeOptions: FieldOption<"soft_log_likelihood" | "hard_weighted">[] = [
    { value: "soft_log_likelihood", label: "Soft log-likelihood", shortLabel: "Soft" },
    { value: "hard_weighted", label: "Hard weighted", shortLabel: "Hard" },
];

const PuzzleboardConfigForm = (props: AlgorithmConfigFormProps<PuzzleboardConfig>) => {
    const { config, onChange, disabled, modal } = props;
    const cols = modal ? 2 : undefined;

    const set = <K extends keyof PuzzleboardConfig>(key: K, value: PuzzleboardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board" columns={cols}>
                <NumberField
                    label="Rows"
                    tooltip="Number of rows of squares on the PuzzleBoard."
                    value={config.boardRows}
                    onChange={(v) => set("boardRows", v ?? 10)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cols"
                    tooltip="Number of columns of squares on the PuzzleBoard."
                    value={config.boardCols}
                    onChange={(v) => set("boardCols", v ?? 10)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cell size (mm)"
                    tooltip="Physical size of one board square in millimeters."
                    value={config.cellSize}
                    onChange={(v) => set("cellSize", v ?? 15)}
                    disabled={disabled}
                    min={0.1}
                    step={0.5}
                />
                <NumberField
                    label="Origin row"
                    tooltip="Row offset of the board origin within the master pattern grid."
                    value={config.originRow}
                    onChange={(v) => set("originRow", v ?? 0)}
                    disabled={disabled}
                    min={0}
                    step={1}
                />
                <NumberField
                    label="Origin col"
                    tooltip="Column offset of the board origin within the master pattern grid."
                    value={config.originCol}
                    onChange={(v) => set("originCol", v ?? 0)}
                    disabled={disabled}
                    min={0}
                    step={1}
                />
            </Section>
            <CollapsibleSection
                title="Decoding"
            >
                <NumberField
                    label="Min window"
                    tooltip="Minimum window size (in cells) for bit sampling."
                    value={config.decodeMinWindow}
                    onChange={(v) => set("decodeMinWindow", v ?? 4)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Min bit confidence"
                    tooltip="Minimum confidence per bit sample (0–1). Higher values reject ambiguous bits."
                    value={config.decodeMinBitConfidence}
                    onChange={(v) => set("decodeMinBitConfidence", v ?? 0.15)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <NumberField
                    label="Max bit error rate"
                    tooltip="Maximum fraction of bits allowed to be wrong (0–1)."
                    value={config.decodeMaxBitErrorRate}
                    onChange={(v) => set("decodeMaxBitErrorRate", v ?? 0.30)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <NumberField
                    label="Sample radius (relative)"
                    tooltip="Sampling radius as a fraction of the cell size (0–0.5)."
                    value={config.decodeSampleRadiusRel}
                    onChange={(v) => set("decodeSampleRadiusRel", v ?? 1 / 6)}
                    disabled={disabled}
                    min={0}
                    max={0.5}
                    step={0.01}
                />
                <CheckboxField
                    label="Search all components"
                    tooltip="When enabled, decode is attempted on all detected connected components."
                    checked={config.decodeSearchAllComponents}
                    onChange={(v) => set("decodeSearchAllComponents", v)}
                    disabled={disabled}
                />
                <SelectField
                    label="Search mode"
                    tooltip="Full scan tries every aligned offset within the master pattern (default — works for any printed sub-board). Fixed board restricts decode to the configured rows × cols at origin_row/col (faster but only succeeds when those match the printed board)."
                    value={config.decodeSearchMode}
                    onChange={(v) => set("decodeSearchMode", v)}
                    disabled={disabled}
                    options={searchModeOptions}
                    presentation="segmented"
                />
                <SelectField
                    label="Scoring mode"
                    tooltip="Soft log-likelihood weights each bit by its confidence (default). Hard weighted treats every bit equally — useful when bit confidences are noisy."
                    value={config.decodeScoringMode}
                    onChange={(v) => set("decodeScoringMode", v)}
                    disabled={disabled}
                    options={scoringModeOptions}
                    presentation="segmented"
                />
                <CollapsibleSection title="Advanced (decoder)">
                    <NumberField
                        label="Bit likelihood slope"
                        tooltip="Steepness of the per-bit log-likelihood mapping. Higher → more weight on confident bits. WASM default: 12."
                        value={config.decodeBitLikelihoodSlope}
                        onChange={(v) => set("decodeBitLikelihoodSlope", v ?? 12)}
                        disabled={disabled}
                        min={0.5}
                        max={100}
                        step={0.5}
                    />
                    <NumberField
                        label="Per-bit floor"
                        tooltip="Lower bound on per-bit log-likelihood contribution (negative; clamps the penalty for very wrong bits). WASM default: -6."
                        value={config.decodePerBitFloor}
                        onChange={(v) => set("decodePerBitFloor", v ?? -6)}
                        disabled={disabled}
                        max={0}
                        step={0.5}
                    />
                    <NumberField
                        label="Alignment min margin"
                        tooltip="Minimum required margin between the best and runner-up alignment scores. Lower → more permissive matches. WASM default: 0.02."
                        value={config.decodeAlignmentMinMargin}
                        onChange={(v) => set("decodeAlignmentMinMargin", v ?? 0.02)}
                        disabled={disabled}
                        min={0}
                        step={0.005}
                    />
                </CollapsibleSection>
            </CollapsibleSection>
            <CollapsibleSection title="Chessboard" columns={cols}>
                <NumberField
                    label="Pixels per square"
                    tooltip="Rectified cell size in pixels used for corner detection."
                    value={config.pxPerSquare}
                    onChange={(v) => set("pxPerSquare", v ?? 60)}
                    disabled={disabled}
                    min={4}
                    step={1}
                />
                <NumberField
                    label="Min corner strength"
                    tooltip="Minimum ChESS response threshold (0–1)."
                    value={config.chessMinCornerStrength}
                    onChange={(v) => set("chessMinCornerStrength", v ?? 0.1)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <NumberField
                    label="Completeness threshold"
                    tooltip="Fraction of expected corners that must be detected."
                    value={config.chessCompletenessThreshold}
                    onChange={(v) => set("chessCompletenessThreshold", v ?? 0.02)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <NumberField
                    label="Min spacing (px)"
                    tooltip="Minimum distance between adjacent corners in pixels."
                    value={config.graphMinSpacingPix}
                    onChange={(v) => set("graphMinSpacingPix", v ?? 8)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Max spacing (px)"
                    tooltip="Maximum distance between adjacent corners in pixels."
                    value={config.graphMaxSpacingPix}
                    onChange={(v) => set("graphMaxSpacingPix", v ?? 600)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
            </CollapsibleSection>
        </>
    );
};

export default PuzzleboardConfigForm;
