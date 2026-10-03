import { Checkbox, Disclosure, Field, InfoHint, NumberInput, Section, Select } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps } from "../../../../lib/fieldBindings";
import type { AlgorithmConfigFormProps } from "../types";
import type { DictionaryName } from "../../../../lib/types";

export interface CharucoConfig {
    rows: number;
    cols: number;
    cellSize: number;
    markerSizeRel: number;
    dictionary: DictionaryName;
    pxPerSquare: number;
    // Chessboard detector sub-params
    chessMinCornerStrength: number;
    chessMinLabeledCorners: number;
    chessMaxComponents: number;
    borderBits: number;
    scanInsetFrac: number;
    scanMinBorderScore: number;
    scanDedupById: boolean;
    scanMultiThreshold: boolean;
    minMarkerInliers: number;
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
            <Section title="Board">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Rows"
                        as="group"
                        annotation={<InfoHint label="About rows">Total number of rows of squares on the ChArUco board.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Rows"
                            {...numberInputProps(config.rows, (v) => set("rows", v ?? 22))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cols"
                        as="group"
                        annotation={<InfoHint label="About cols">Total number of columns of squares on the ChArUco board.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Cols"
                            {...numberInputProps(config.cols, (v) => set("cols", v ?? 22))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cell size"
                        as="group"
                        annotation={<InfoHint label="About cell size">Physical size of one board square in millimeters. Used for metric calibration.</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Cell size"
                            {...numberInputProps(config.cellSize, (v) => set("cellSize", v ?? 4.8))}
                            disabled={disabled}
                            min={0.1}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Marker size (relative)"
                        as="group"
                        annotation={<InfoHint label="About marker size (relative)">ArUco marker size as a fraction of the cell size (0.1-0.99). Larger markers are easier to detect.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Marker size (relative)"
                            {...numberInputProps(config.markerSizeRel, (v) => set("markerSizeRel", v ?? 0.75))}
                            disabled={disabled}
                            min={0.1}
                            max={0.99}
                            step={0.05}
                        />
                    </Field>
                    <Field
                        label="Dictionary"
                        as="group"
                        annotation={<InfoHint label="About dictionary">ArUco marker dictionary encoding. Must match the dictionary used to print the board.</InfoHint>}
                    >
                        <Select
                            aria-label="Dictionary"
                            {...choiceProps(config.dictionary, DICTIONARY_OPTIONS, (v) => set("dictionary", v))}
                            disabled={disabled}
                        />
                    </Field>
                    <Field
                        label="Border bits"
                        as="group"
                        annotation={<InfoHint label="About border bits">ArUco quiet-zone width in marker bits, as printed on the physical board. This describes the board, not a scan-time tuning knob — the detector derives its scan border width from this value. WASM default: 1.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Border bits"
                            {...numberInputProps(config.borderBits, (v) => set("borderBits", v ?? 1))}
                            disabled={disabled}
                            min={1}
                            max={4}
                            step={1}
                        />
                    </Field>
                </div>
            </Section>
            <Disclosure summary="Marker decoding">
                <div className={fieldGridClass()}>
                    <Field
                        label="Pixels per square"
                        as="group"
                        annotation={<InfoHint label="About pixels per square">Size of the rectified cell (in pixels) used to read ArUco marker codes. Higher values improve decode accuracy at the cost of speed.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Pixels per square"
                            {...numberInputProps(config.pxPerSquare, (v) => set("pxPerSquare", v ?? 40))}
                            disabled={disabled}
                            min={4}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Chessboard detector">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Min corner strength"
                        as="group"
                        annotation={<InfoHint label="About min corner strength">Absolute floor on the raw ChESS response (detector default 15). Lower values detect weaker corners but may increase false positives.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min corner strength"
                            {...numberInputProps(config.chessMinCornerStrength, (v) => set("chessMinCornerStrength", v ?? 15))}
                            disabled={disabled}
                            min={0}
                            max={500}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min labeled corners"
                        as="group"
                        annotation={<InfoHint label="About min labeled corners">Fewest grid-labeled corners a detected board component may have. Raise it to ignore small fragments. Library default: 8.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min labeled corners"
                            {...numberInputProps(config.chessMinLabeledCorners, (v) => set("chessMinLabeledCorners", v ?? 8))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Max components"
                        as="group"
                        annotation={<InfoHint label="About max components">Most separate grid components kept per image. Library default: 3.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max components"
                            {...numberInputProps(config.chessMaxComponents, (v) => set("chessMaxComponents", v ?? 3))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Advanced">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Scan: inset fraction"
                        as="group"
                        annotation={<InfoHint label="About scan: inset fraction">Fraction of the cell inset before sampling marker pixels. Higher → safer sampling, less likely to overlap chessboard ink. WASM default: 0.06.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Scan: inset fraction"
                            {...numberInputProps(config.scanInsetFrac, (v) => set("scanInsetFrac", v ?? 0.06))}
                            disabled={disabled}
                            min={0}
                            max={0.4}
                            step={0.01}
                        />
                    </Field>
                    <Field
                        label="Scan: min border score"
                        as="group"
                        annotation={<InfoHint label="About scan: min border score">Minimum quiet-zone score required to accept a candidate marker (0–1). Lower → more permissive. WASM default: 0.75.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Scan: min border score"
                            {...numberInputProps(config.scanMinBorderScore, (v) => set("scanMinBorderScore", v ?? 0.75))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                    </Field>
                    <div className="flex items-center gap-1.5">
                        <Checkbox
                            label="Scan: dedup by ID"
                            checked={config.scanDedupById}
                            onCheckedChange={(v) => set("scanDedupById", v)}
                            disabled={disabled}
                        />
                        <InfoHint label="About scan: dedup by ID">Drop duplicate detections sharing the same marker ID. WASM default: on.</InfoHint>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Checkbox
                            label="Scan: multi-threshold"
                            checked={config.scanMultiThreshold}
                            onCheckedChange={(v) => set("scanMultiThreshold", v)}
                            disabled={disabled}
                        />
                        <InfoHint label="About scan: multi-threshold">Try several adaptive thresholds when scanning marker bits — slower but more robust. WASM default: on.</InfoHint>
                    </div>
                    <Field
                        label="Min marker inliers"
                        as="group"
                        annotation={<InfoHint label="About min marker inliers">Minimum number of decoded markers required to accept the board. WASM default: 8.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min marker inliers"
                            {...numberInputProps(config.minMarkerInliers, (v) => set("minMarkerInliers", v ?? 8))}
                            disabled={disabled}
                            min={1}
                            max={64}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
        </>
    );
};

export default CharucoConfigForm;
