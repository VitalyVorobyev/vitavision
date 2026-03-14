import { NumberField, Section, SelectField } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";
import type { DictionaryName } from "../../../../lib/api";

export interface CharucoConfig {
    rows: number;
    cols: number;
    cellSize: number;
    markerSizeRel: number;
    dictionary: DictionaryName;
    pxPerSquare: number;
    // Chessboard detector sub-params
    chessExpectedRows: number;
    chessExpectedCols: number;
    chessMinCornerStrength: number;
    chessCompletenessThreshold: number;
    // Grid graph sub-params
    graphMinSpacingPix: number;
    graphMaxSpacingPix: number;
    graphKNeighbors: number;
    graphOrientationToleranceDeg: number;
}

const DICTIONARY_OPTIONS: Array<{ value: DictionaryName; label: string }> = [
    { value: "DICT_4X4_1000", label: "4×4 (1000)" },
    { value: "DICT_4X4_250", label: "4×4 (250)" },
    { value: "DICT_4X4_100", label: "4×4 (100)" },
    { value: "DICT_4X4_50", label: "4×4 (50)" },
    { value: "DICT_5X5_1000", label: "5×5 (1000)" },
    { value: "DICT_5X5_250", label: "5×5 (250)" },
    { value: "DICT_5X5_100", label: "5×5 (100)" },
    { value: "DICT_5X5_50", label: "5×5 (50)" },
    { value: "DICT_6X6_1000", label: "6×6 (1000)" },
    { value: "DICT_7X7_1000", label: "7×7 (1000)" },
    { value: "DICT_ARUCO_ORIGINAL", label: "ArUco original" },
    { value: "DICT_APRILTAG_36h11", label: "AprilTag 36h11" },
];

const CharucoConfigForm = (props: AlgorithmConfigFormProps<CharucoConfig>) => {
    const { config, onChange, disabled } = props;

    const set = <K extends keyof CharucoConfig>(key: K, value: CharucoConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board">
                <NumberField
                    label="Rows"
                    value={config.rows}
                    onChange={(v) => set("rows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cols"
                    value={config.cols}
                    onChange={(v) => set("cols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cell size (mm)"
                    value={config.cellSize}
                    onChange={(v) => set("cellSize", v ?? 4.8)}
                    disabled={disabled}
                    min={0.1}
                    step={0.1}
                />
                <NumberField
                    label="Marker size (relative)"
                    value={config.markerSizeRel}
                    onChange={(v) => set("markerSizeRel", v ?? 0.75)}
                    disabled={disabled}
                    min={0.1}
                    max={0.99}
                    step={0.05}
                />
                <SelectField
                    label="Dictionary"
                    value={config.dictionary}
                    onChange={(v) => set("dictionary", v)}
                    disabled={disabled}
                    options={DICTIONARY_OPTIONS}
                />
            </Section>
            <Section title="Rendering">
                <NumberField
                    label="Pixels per square"
                    value={config.pxPerSquare}
                    onChange={(v) => set("pxPerSquare", v ?? 40)}
                    disabled={disabled}
                    min={4}
                    step={1}
                />
            </Section>
            <Section title="Chessboard detector">
                <NumberField
                    label="Expected rows"
                    value={config.chessExpectedRows}
                    onChange={(v) => set("chessExpectedRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Expected cols"
                    value={config.chessExpectedCols}
                    onChange={(v) => set("chessExpectedCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Min corner strength"
                    value={config.chessMinCornerStrength}
                    onChange={(v) => set("chessMinCornerStrength", v ?? 0.2)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <NumberField
                    label="Completeness threshold"
                    value={config.chessCompletenessThreshold}
                    onChange={(v) => set("chessCompletenessThreshold", v ?? 0.05)}
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
        </>
    );
};

export default CharucoConfigForm;
