import { Section, NumberField, SelectField } from "../../editor/algorithms/formFields";
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
        <Section title="ChArUco Board" columns={2}>
            <NumberField
                label="Rows"
                value={config.rows}
                onChange={(v) => update({ rows: v ?? 8 })}
                disabled={false}
                min={2}
                max={100}
                step={1}
                tooltip="Total board rows (squares)"
            />
            <NumberField
                label="Cols"
                value={config.cols}
                onChange={(v) => update({ cols: v ?? 11 })}
                disabled={false}
                min={2}
                max={100}
                step={1}
                tooltip="Total board columns (squares)"
            />
            <NumberField
                label="Square size (mm)"
                value={config.squareSizeMm}
                onChange={(v) => update({ squareSizeMm: v ?? 20 })}
                disabled={false}
                min={1}
                max={500}
                step={0.5}
                tooltip="Physical size of each square in millimeters"
            />
            <NumberField
                label="Marker ratio"
                value={config.markerSizeRel}
                onChange={(v) => update({ markerSizeRel: v ?? 0.75 })}
                disabled={false}
                min={0.1}
                max={0.99}
                step={0.05}
                tooltip="Marker size relative to square"
            />
            <div className="col-span-2">
                <SelectField
                    label="Dictionary"
                    value={config.dictionary}
                    onChange={(v) => update({ dictionary: v })}
                    disabled={false}
                    options={DICTIONARY_OPTIONS}
                    tooltip="ArUco marker dictionary — NxN is the bit grid size, number is the pool size"
                />
            </div>
            <NumberField
                label="Border bits"
                value={config.borderBits}
                onChange={(v) => update({ borderBits: v ?? 1 })}
                disabled={false}
                min={0}
                max={16}
                step={1}
                tooltip="Black border width around each marker in bits"
            />
            <NumberField
                label="Inner square"
                value={config.innerSquareRel}
                onChange={(v) => update({ innerSquareRel: v ?? 0 })}
                disabled={false}
                min={0}
                max={0.95}
                step={0.05}
                tooltip="White square inside black squares (0 = off). For laser calibration targets."
            />
        </Section>
        <p className="text-[11px] text-muted-foreground mt-2">
            Board layout is compatible with OpenCV ChArUco conventions.
        </p>
        </>
    );
}
