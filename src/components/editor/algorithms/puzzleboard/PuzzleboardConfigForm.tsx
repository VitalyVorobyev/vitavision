import { Checkbox, Disclosure, Field, InfoHint, NumberInput, Section, SegmentedControl } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../../lib/fieldBindings";
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
    chessMinLabeledCorners: number;
    chessMaxComponents: number;
    decodeSearchMode: "full" | "fixed_board";
    decodeScoringMode: "hard_weighted" | "soft_log_likelihood";
}

const searchModeOptions: ChoiceOption<"fixed_board" | "full">[] = [
    { value: "fixed_board", label: "Fixed board" },
    { value: "full", label: "Full scan" },
];

const scoringModeOptions: ChoiceOption<"soft_log_likelihood" | "hard_weighted">[] = [
    { value: "soft_log_likelihood", label: "Soft log-likelihood" },
    { value: "hard_weighted", label: "Hard weighted" },
];

const PuzzleboardConfigForm = (props: AlgorithmConfigFormProps<PuzzleboardConfig>) => {
    const { config, onChange, disabled, modal } = props;
    const cols = modal ? 2 : undefined;

    const set = <K extends keyof PuzzleboardConfig>(key: K, value: PuzzleboardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Rows"
                        as="group"
                        annotation={<InfoHint label="About rows">Number of rows of squares on the PuzzleBoard.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Rows"
                            {...numberInputProps(config.boardRows, (v) => set("boardRows", v ?? 10))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cols"
                        as="group"
                        annotation={<InfoHint label="About cols">Number of columns of squares on the PuzzleBoard.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Cols"
                            {...numberInputProps(config.boardCols, (v) => set("boardCols", v ?? 10))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cell size"
                        as="group"
                        annotation={<InfoHint label="About cell size">Physical size of one board square in millimeters.</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Cell size"
                            {...numberInputProps(config.cellSize, (v) => set("cellSize", v ?? 15))}
                            disabled={disabled}
                            min={0.1}
                            step={0.5}
                        />
                    </Field>
                    <Field
                        label="Origin row"
                        as="group"
                        annotation={<InfoHint label="About origin row">Row offset of the board origin within the master pattern grid.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Origin row"
                            {...numberInputProps(config.originRow, (v) => set("originRow", v ?? 0))}
                            disabled={disabled}
                            min={0}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Origin col"
                        as="group"
                        annotation={<InfoHint label="About origin col">Column offset of the board origin within the master pattern grid.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Origin col"
                            {...numberInputProps(config.originCol, (v) => set("originCol", v ?? 0))}
                            disabled={disabled}
                            min={0}
                            step={1}
                        />
                    </Field>
                </div>
            </Section>
            <Disclosure summary="Decoding">
                <div className={fieldGridClass()}>
                    <Field
                        label="Min window"
                        as="group"
                        annotation={<InfoHint label="About min window">Minimum window size (in cells) for bit sampling.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min window"
                            {...numberInputProps(config.decodeMinWindow, (v) => set("decodeMinWindow", v ?? 4))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min bit confidence"
                        as="group"
                        annotation={<InfoHint label="About min bit confidence">Minimum confidence per bit sample (0–1). Higher values reject ambiguous bits.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min bit confidence"
                            {...numberInputProps(config.decodeMinBitConfidence, (v) => set("decodeMinBitConfidence", v ?? 0.15))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                    </Field>
                    <Field
                        label="Max bit error rate"
                        as="group"
                        annotation={<InfoHint label="About max bit error rate">Maximum fraction of bits allowed to be wrong (0–1).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max bit error rate"
                            {...numberInputProps(config.decodeMaxBitErrorRate, (v) => set("decodeMaxBitErrorRate", v ?? 0.30))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                    </Field>
                    <Field
                        label="Sample radius (relative)"
                        as="group"
                        annotation={<InfoHint label="About sample radius (relative)">Sampling radius as a fraction of the cell size (0–0.5).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Sample radius (relative)"
                            {...numberInputProps(config.decodeSampleRadiusRel, (v) => set("decodeSampleRadiusRel", v ?? 1 / 6))}
                            disabled={disabled}
                            min={0}
                            max={0.5}
                            step={0.01}
                        />
                    </Field>
                    <div className="flex items-center gap-1.5">
                        <Checkbox
                            label="Search all components"
                            checked={config.decodeSearchAllComponents}
                            onCheckedChange={(v) => set("decodeSearchAllComponents", v)}
                            disabled={disabled}
                        />
                        <InfoHint label="About search all components">When enabled, decode is attempted on all detected connected components.</InfoHint>
                    </div>
                    <Field
                        label="Search mode"
                        as="group"
                        annotation={<InfoHint label="About search mode">Full scan tries every aligned offset within the master pattern (default — works for any printed sub-board). Fixed board restricts decode to the configured rows × cols at origin_row/col (faster but only succeeds when those match the printed board).</InfoHint>}
                    >
                        <SegmentedControl
                            aria-label="Search mode"
                            {...choiceProps(config.decodeSearchMode, searchModeOptions, (v) => set("decodeSearchMode", v))}
                            disabled={disabled}
                        />
                    </Field>
                    <Field
                        label="Scoring mode"
                        as="group"
                        annotation={<InfoHint label="About scoring mode">Soft log-likelihood weights each bit by its confidence (default). Hard weighted treats every bit equally — useful when bit confidences are noisy.</InfoHint>}
                    >
                        <SegmentedControl
                            aria-label="Scoring mode"
                            {...choiceProps(config.decodeScoringMode, scoringModeOptions, (v) => set("decodeScoringMode", v))}
                            disabled={disabled}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Chessboard">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Pixels per square"
                        as="group"
                        annotation={<InfoHint label="About pixels per square">Rectified cell size in pixels used for corner detection.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Pixels per square"
                            {...numberInputProps(config.pxPerSquare, (v) => set("pxPerSquare", v ?? 60))}
                            disabled={disabled}
                            min={4}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min corner strength"
                        as="group"
                        annotation={<InfoHint label="About min corner strength">Absolute floor on the raw ChESS response (not a 0–1 scale). Library default 33; values of 15 or below add no filtering beyond the corner detector threshold.</InfoHint>}
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
        </>
    );
};

export default PuzzleboardConfigForm;
