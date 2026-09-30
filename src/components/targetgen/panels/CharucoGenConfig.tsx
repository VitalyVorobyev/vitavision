import { Field, InfoHint, NumberInput, Section, Select } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps } from "../../../lib/fieldBindings";
import type { CharucoConfig, TargetGeneratorAction } from "../types";
import type { DictionaryName } from "../../../lib/types";

const DICTIONARY_OPTIONS: { value: DictionaryName; label: string }[] = [
    { value: "DICT_4X4_50", label: "4x4 (50)" },
    { value: "DICT_4X4_100", label: "4x4 (100)" },
    { value: "DICT_4X4_250", label: "4x4 (250)" },
    { value: "DICT_4X4_1000", label: "4x4 (1000)" },
    { value: "DICT_5X5_50", label: "5x5 (50)" },
    { value: "DICT_5X5_100", label: "5x5 (100)" },
    { value: "DICT_5X5_250", label: "5x5 (250)" },
    { value: "DICT_5X5_1000", label: "5x5 (1000)" },
    { value: "DICT_6X6_50", label: "6x6 (50)" },
    { value: "DICT_6X6_100", label: "6x6 (100)" },
    { value: "DICT_6X6_250", label: "6x6 (250)" },
    { value: "DICT_6X6_1000", label: "6x6 (1000)" },
    { value: "DICT_7X7_50", label: "7x7 (50)" },
    { value: "DICT_7X7_100", label: "7x7 (100)" },
    { value: "DICT_7X7_250", label: "7x7 (250)" },
    { value: "DICT_7X7_1000", label: "7x7 (1000)" },
    { value: "DICT_APRILTAG_16h5", label: "AprilTag 16h5" },
    { value: "DICT_APRILTAG_25h9", label: "AprilTag 25h9" },
    { value: "DICT_APRILTAG_36h10", label: "AprilTag 36h10" },
    { value: "DICT_APRILTAG_36h11", label: "AprilTag 36h11" },
    { value: "DICT_ARUCO_MIP_36h12", label: "ArUco MIP 36h12" },
    { value: "DICT_ARUCO_ORIGINAL", label: "ArUco Original" },
];

interface Props {
    config: CharucoConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function CharucoGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<CharucoConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
        <>
        <Section title="ChArUco Board">
            <div className={fieldGridClass(2)}>
                <Field
                    label="Rows"
                    as="group"
                    annotation={<InfoHint label="About rows">Total board rows (squares)</InfoHint>}
                >
                    <NumberInput
                        aria-label="Rows"
                        {...numberInputProps(config.rows, (v) => update({ rows: v ?? 8 }))}
                        min={2}
                        max={100}
                        step={1}
                    />
                </Field>
                <Field
                    label="Cols"
                    as="group"
                    annotation={<InfoHint label="About cols">Total board columns (squares)</InfoHint>}
                >
                    <NumberInput
                        aria-label="Cols"
                        {...numberInputProps(config.cols, (v) => update({ cols: v ?? 11 }))}
                        min={2}
                        max={100}
                        step={1}
                    />
                </Field>
                <Field
                    label="Square size"
                    as="group"
                    annotation={<InfoHint label="About square size">Physical size of each square in millimeters</InfoHint>}
                >
                    <NumberInput
                        unit="mm"
                        aria-label="Square size"
                        {...numberInputProps(config.squareSizeMm, (v) => update({ squareSizeMm: v ?? 20 }))}
                        min={1}
                        max={500}
                        step={0.5}
                    />
                </Field>
                <Field
                    label="Marker ratio"
                    as="group"
                    annotation={<InfoHint label="About marker ratio">Marker size relative to square</InfoHint>}
                >
                    <NumberInput
                        aria-label="Marker ratio"
                        {...numberInputProps(config.markerSizeRel, (v) => update({ markerSizeRel: v ?? 0.75 }))}
                        min={0.1}
                        max={0.99}
                        step={0.05}
                    />
                </Field>
                <div className="col-span-2">
                    <Field
                        label="Dictionary"
                        as="group"
                        annotation={<InfoHint label="About dictionary">ArUco marker dictionary — NxN is the bit grid size, number is the pool size</InfoHint>}
                    >
                        <Select
                            aria-label="Dictionary"
                            {...choiceProps(config.dictionary, DICTIONARY_OPTIONS, (v) => update({ dictionary: v }))}
                        />
                    </Field>
                </div>
                <Field
                    label="Border bits"
                    as="group"
                    annotation={<InfoHint label="About border bits">Black border width around each marker in bits</InfoHint>}
                >
                    <NumberInput
                        aria-label="Border bits"
                        {...numberInputProps(config.borderBits, (v) => update({ borderBits: v ?? 1 }))}
                        min={0}
                        max={16}
                        step={1}
                    />
                </Field>
                <Field
                    label="Inner square"
                    as="group"
                    annotation={<InfoHint label="About inner square">White square inside black squares (0 = off). For laser calibration targets.</InfoHint>}
                >
                    <NumberInput
                        aria-label="Inner square"
                        {...numberInputProps(config.innerSquareRel, (v) => update({ innerSquareRel: v ?? 0 }))}
                        min={0}
                        max={0.95}
                        step={0.05}
                    />
                </Field>
            </div>
        </Section>
        <p className="text-[11px] text-fg-muted mt-2">
            Board layout is compatible with OpenCV ChArUco conventions.
        </p>
        </>
    );
}
