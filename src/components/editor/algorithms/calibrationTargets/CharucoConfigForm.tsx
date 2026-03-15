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
    { value: "DICT_4X4_1000", label: "4\u00d74 (1000)" },
    { value: "DICT_4X4_250", label: "4\u00d74 (250)" },
    { value: "DICT_4X4_100", label: "4\u00d74 (100)" },
    { value: "DICT_4X4_50", label: "4\u00d74 (50)" },
    { value: "DICT_5X5_1000", label: "5\u00d75 (1000)" },
    { value: "DICT_5X5_250", label: "5\u00d75 (250)" },
    { value: "DICT_5X5_100", label: "5\u00d75 (100)" },
    { value: "DICT_5X5_50", label: "5\u00d75 (50)" },
    { value: "DICT_6X6_1000", label: "6\u00d76 (1000)" },
    { value: "DICT_7X7_1000", label: "7\u00d77 (1000)" },
    { value: "DICT_ARUCO_ORIGINAL", label: "ArUco original" },
    { value: "DICT_APRILTAG_36h11", label: "AprilTag 36h11" },
];

const CharucoConfigForm = (props: AlgorithmConfigFormProps<CharucoConfig>) => {
    const { config, onChange, disabled, modal } = props;
    const cols = modal ? 2 : undefined;

    const set = <K extends keyof CharucoConfig>(key: K, value: CharucoConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board" columns={cols}>
                <NumberField
                    label="Rows"
                    tooltip="Total number of rows of squares on the ChArUco board."
                    value={config.rows}
                    onChange={(v) => set("rows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cols"
                    tooltip="Total number of columns of squares on the ChArUco board."
                    value={config.cols}
                    onChange={(v) => set("cols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cell size (mm)"
                    tooltip="Physical size of one board square in millimeters. Used for metric calibration."
                    value={config.cellSize}
                    onChange={(v) => set("cellSize", v ?? 4.8)}
                    disabled={disabled}
                    min={0.1}
                    step={0.1}
                />
                <NumberField
                    label="Marker size (relative)"
                    tooltip="ArUco marker size as a fraction of the cell size (0.1-0.99). Larger markers are easier to detect."
                    value={config.markerSizeRel}
                    onChange={(v) => set("markerSizeRel", v ?? 0.75)}
                    disabled={disabled}
                    min={0.1}
                    max={0.99}
                    step={0.05}
                />
                <SelectField
                    label="Dictionary"
                    tooltip="ArUco marker dictionary encoding. Must match the dictionary used to print the board."
                    value={config.dictionary}
                    onChange={(v) => set("dictionary", v)}
                    disabled={disabled}
                    options={DICTIONARY_OPTIONS}
                />
            </Section>
            <Section title="Rendering">
                <NumberField
                    label="Pixels per square"
                    tooltip="Expected size of one board square in pixels. Sets the detection scale for corner finding."
                    value={config.pxPerSquare}
                    onChange={(v) => set("pxPerSquare", v ?? 40)}
                    disabled={disabled}
                    min={4}
                    step={1}
                />
            </Section>
            <Section title="Chessboard detector" columns={cols}>
                <NumberField
                    label="Expected rows"
                    tooltip="Number of internal corner rows expected on the board (squares minus one)."
                    value={config.chessExpectedRows}
                    onChange={(v) => set("chessExpectedRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Expected cols"
                    tooltip="Number of internal corner columns expected on the board (squares minus one)."
                    value={config.chessExpectedCols}
                    onChange={(v) => set("chessExpectedCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Min corner strength"
                    tooltip="Minimum ChESS response threshold (0-1). Lower values detect weaker corners but increase false positives."
                    value={config.chessMinCornerStrength}
                    onChange={(v) => set("chessMinCornerStrength", v ?? 0.2)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <NumberField
                    label="Completeness threshold"
                    tooltip="Fraction of expected corners that must be detected for the board to be accepted."
                    value={config.chessCompletenessThreshold}
                    onChange={(v) => set("chessCompletenessThreshold", v ?? 0.05)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
            </Section>
            <Section title="Grid graph" columns={cols}>
                <NumberField
                    label="Min spacing (px)"
                    tooltip="Minimum distance between adjacent corners in pixels. Filters out noise from too-close detections."
                    value={config.graphMinSpacingPix}
                    onChange={(v) => set("graphMinSpacingPix", v ?? 40)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="Max spacing (px)"
                    tooltip="Maximum distance between adjacent corners in pixels. Limits graph edge length."
                    value={config.graphMaxSpacingPix}
                    onChange={(v) => set("graphMaxSpacingPix", v ?? 160)}
                    disabled={disabled}
                    min={1}
                    step={1}
                />
                <NumberField
                    label="K neighbors"
                    tooltip="Number of nearest neighbors considered when building the corner graph. Higher values handle irregular boards better."
                    value={config.graphKNeighbors}
                    onChange={(v) => set("graphKNeighbors", v ?? 8)}
                    disabled={disabled}
                    min={1}
                    max={64}
                    step={1}
                />
                <NumberField
                    label="Orientation tolerance (°)"
                    tooltip="Maximum angle deviation from grid directions when connecting corners. Handles perspective distortion."
                    value={config.graphOrientationToleranceDeg}
                    onChange={(v) => set("graphOrientationToleranceDeg", v ?? 12.5)}
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
