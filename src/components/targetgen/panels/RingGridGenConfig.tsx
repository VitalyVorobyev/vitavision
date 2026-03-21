import { Section, NumberField, SelectField, CollapsibleSection } from "../../editor/algorithms/formFields";
import type { RingGridConfig, RingGridProfile, TargetGeneratorAction } from "../types";

interface Props {
    config: RingGridConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

const PROFILE_OPTIONS: { value: RingGridProfile; label: string }[] = [
    { value: "baseline", label: "Baseline" },
    { value: "extended", label: "Extended" },
];

export default function RingGridGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<RingGridConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
        <>
            <Section title="Ring Grid" columns={2}>
                <NumberField
                    label="Rows"
                    value={config.rows}
                    onChange={(v) => update({ rows: v ?? 15 })}
                    disabled={false}
                    min={1}
                    max={50}
                    step={1}
                    tooltip="Number of hex-lattice rows"
                />
                <NumberField
                    label="Long row cols"
                    value={config.longRowCols}
                    onChange={(v) => update({ longRowCols: v ?? 14 })}
                    disabled={false}
                    min={1}
                    max={50}
                    step={1}
                    tooltip="Number of columns in the longest row"
                />
                <NumberField
                    label="Pitch (mm)"
                    value={config.pitchMm}
                    onChange={(v) => update({ pitchMm: v ?? 8 })}
                    disabled={false}
                    min={2}
                    max={50}
                    step={0.5}
                    tooltip="Center-to-center hex pitch in millimeters"
                />
                <SelectField
                    label="Codebook profile"
                    value={config.profile}
                    options={PROFILE_OPTIONS}
                    onChange={(v) => update({ profile: v })}
                    disabled={false}
                    tooltip="Baseline: 893 markers (min cyclic Hamming dist 2). Extended: 2180 markers (min dist 1)."
                />
            </Section>
            <CollapsibleSection title="Marker geometry" columns={2}>
                <NumberField
                    label="Outer radius (mm)"
                    value={config.markerOuterRadiusMm}
                    onChange={(v) => update({ markerOuterRadiusMm: v ?? 5.6 })}
                    disabled={false}
                    min={0.5}
                    max={25}
                    step={0.1}
                    tooltip="Outer ring center radius in millimeters"
                />
                <NumberField
                    label="Inner radius (mm)"
                    value={config.markerInnerRadiusMm}
                    onChange={(v) => update({ markerInnerRadiusMm: v ?? 3.2 })}
                    disabled={false}
                    min={0.5}
                    max={25}
                    step={0.1}
                    tooltip="Inner ring center radius in millimeters"
                />
                <NumberField
                    label="Ring width (mm)"
                    value={config.markerRingWidthMm}
                    onChange={(v) => update({ markerRingWidthMm: v ?? 0.8 })}
                    disabled={false}
                    min={0.1}
                    max={5}
                    step={0.05}
                    tooltip="Stroke width of both concentric rings"
                />
            </CollapsibleSection>
        </>
    );
}
