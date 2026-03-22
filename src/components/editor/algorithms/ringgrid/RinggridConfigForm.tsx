import { NumberField, Section, SelectField, type FieldOption } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface RinggridConfig {
    rows: number;
    longRowCols: number;
    pitchMm: number;
    markerOuterRadiusMm: number;
    markerInnerRadiusMm: number;
    markerRingWidthMm: number;
    profile: "baseline" | "extended";
}

const RinggridConfigForm = (props: AlgorithmConfigFormProps<RinggridConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof RinggridConfig>(key: K, value: RinggridConfig[K]) =>
        onChange({ ...config, [key]: value });

    const profileOptions: FieldOption<RinggridConfig["profile"]>[] = [
        { value: "baseline", label: "Baseline (893 codes)", shortLabel: "Baseline" },
        { value: "extended", label: "Extended (2180 codes)", shortLabel: "Extended" },
    ];

    return (
        <>
            <Section title="Grid layout" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Rows"
                    tooltip="Number of hex-lattice rows."
                    value={config.rows}
                    onChange={(v) => set("rows", v ?? 15)}
                    disabled={disabled}
                    min={1}
                    max={200}
                    step={1}
                />
                <NumberField
                    label="Long row cols"
                    tooltip="Number of markers in the longest row."
                    value={config.longRowCols}
                    onChange={(v) => set("longRowCols", v ?? 14)}
                    disabled={disabled}
                    min={1}
                    max={200}
                    step={1}
                />
                <NumberField
                    label="Pitch (mm)"
                    tooltip="Center-to-center distance between adjacent markers in millimeters."
                    value={config.pitchMm}
                    onChange={(v) => set("pitchMm", v ?? 8.0)}
                    disabled={disabled}
                    min={0.1}
                    step={0.5}
                />
            </Section>
            <Section title="Marker geometry" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Outer radius (mm)"
                    tooltip="Radius of the outer ring in millimeters."
                    value={config.markerOuterRadiusMm}
                    onChange={(v) => set("markerOuterRadiusMm", v ?? 5.6)}
                    disabled={disabled}
                    min={0.1}
                    step={0.1}
                />
                <NumberField
                    label="Inner radius (mm)"
                    tooltip="Radius of the inner ring in millimeters."
                    value={config.markerInnerRadiusMm}
                    onChange={(v) => set("markerInnerRadiusMm", v ?? 3.2)}
                    disabled={disabled}
                    min={0.1}
                    step={0.1}
                />
                <NumberField
                    label="Ring width (mm)"
                    tooltip="Stroke width of both concentric rings in millimeters."
                    value={config.markerRingWidthMm}
                    onChange={(v) => set("markerRingWidthMm", v ?? 0.8)}
                    disabled={disabled}
                    min={0.1}
                    step={0.1}
                />
            </Section>
            <Section title="Codebook">
                <SelectField
                    label="Profile"
                    tooltip="Baseline: 893 codes, cyclic Hamming distance >= 2. Extended: 2180 codes, distance >= 1."
                    value={config.profile}
                    onChange={(v) => set("profile", v)}
                    disabled={disabled}
                    options={profileOptions}
                />
            </Section>
        </>
    );
};

export default RinggridConfigForm;
