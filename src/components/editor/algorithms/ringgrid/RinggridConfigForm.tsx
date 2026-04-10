import { CheckboxField, CollapsibleSection, NumberField, Section, SelectField, type FieldOption } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface RinggridConfig {
    // Board layout
    rows: number;
    longRowCols: number;
    pitchMm: number;
    markerOuterRadiusMm: number;
    markerInnerRadiusMm: number;
    markerRingWidthMm: number;
    // Codebook
    profile: "baseline" | "extended";
    // Detection scale
    diameterMinPx: number;
    diameterMaxPx: number;
    // Proposal
    gradThreshold: number;
    edgeThinning: boolean;
    // Decode
    maxDecodeDist: number;
    minDecodeConfidence: number;
    // Completion
    enableCompletion: boolean;
    // Self-undistort
    enableSelfUndistort: boolean;
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
            <CollapsibleSection title="Detection scale" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Min diameter (px)"
                    tooltip="Minimum expected marker diameter in pixels."
                    value={config.diameterMinPx}
                    onChange={(v) => set("diameterMinPx", v ?? 14)}
                    disabled={disabled}
                    min={4}
                    max={500}
                    step={1}
                />
                <NumberField
                    label="Max diameter (px)"
                    tooltip="Maximum expected marker diameter in pixels."
                    value={config.diameterMaxPx}
                    onChange={(v) => set("diameterMaxPx", v ?? 66)}
                    disabled={disabled}
                    min={4}
                    max={500}
                    step={1}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Proposals" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Gradient threshold"
                    tooltip="Minimum gradient magnitude for proposal voting. Lower detects weaker features."
                    value={config.gradThreshold}
                    onChange={(v) => set("gradThreshold", v ?? 0.05)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <CheckboxField
                    label="Edge thinning"
                    tooltip="Apply non-maximum suppression to gradient field before voting."
                    checked={config.edgeThinning}
                    onChange={(v) => set("edgeThinning", v)}
                    disabled={disabled}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Decode" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Max decode distance"
                    tooltip="Maximum Hamming distance for codebook matching."
                    value={config.maxDecodeDist}
                    onChange={(v) => set("maxDecodeDist", v ?? 3)}
                    disabled={disabled}
                    min={0}
                    max={10}
                    step={1}
                />
                <NumberField
                    label="Min confidence"
                    tooltip="Minimum confidence score for decode acceptance."
                    value={config.minDecodeConfidence}
                    onChange={(v) => set("minDecodeConfidence", v ?? 0.3)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.05}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Advanced">
                <CheckboxField
                    label="Marker completion"
                    tooltip="Attempt to recover missing markers using homography reprojection."
                    checked={config.enableCompletion}
                    onChange={(v) => set("enableCompletion", v)}
                    disabled={disabled}
                />
                <CheckboxField
                    label="Self-undistort"
                    tooltip="Estimate and compensate for radial lens distortion during detection."
                    checked={config.enableSelfUndistort}
                    onChange={(v) => set("enableSelfUndistort", v)}
                    disabled={disabled}
                />
            </CollapsibleSection>
        </>
    );
};

export default RinggridConfigForm;
