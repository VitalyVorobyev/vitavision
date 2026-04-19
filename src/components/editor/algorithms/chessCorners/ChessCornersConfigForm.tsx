import { CheckboxField, CollapsibleSection, NumberField, Section, SelectField } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface ChessCornersConfig {
    thresholdRel: number;
    nmsRadius: number;
    minClusterSize: number;
    broadMode: boolean;
    pyramidLevels: number;
    pyramidMinSize: number;
    upscaleFactor: number;
    refiner: "center_of_mass" | "forstner" | "saddle_point";
}

const refinerOptions = [
    { value: "center_of_mass" as const, label: "Center of mass", shortLabel: "CoM" },
    { value: "forstner" as const, label: "Förstner", shortLabel: "Fstr" },
    { value: "saddle_point" as const, label: "Saddle point", shortLabel: "Saddle" },
];

const upscaleOptions = [
    { value: "0" as const, label: "Off" },
    { value: "2" as const, label: "×2" },
    { value: "3" as const, label: "×3" },
    { value: "4" as const, label: "×4" },
];

const ChessCornersConfigForm = (props: AlgorithmConfigFormProps<ChessCornersConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof ChessCornersConfig>(key: K, value: ChessCornersConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Detection" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Threshold (relative)"
                    tooltip="Relative response threshold (0–1). Lower values detect more corners but may increase false positives."
                    value={config.thresholdRel}
                    onChange={(v) => set("thresholdRel", v ?? 0.2)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <NumberField
                    label="NMS radius"
                    tooltip="Non-maximum suppression radius in pixels. Prevents duplicate detections."
                    value={config.nmsRadius}
                    onChange={(v) => set("nmsRadius", v ?? 2)}
                    disabled={disabled}
                    min={1}
                    max={10}
                    step={1}
                />
                <NumberField
                    label="Min cluster size"
                    tooltip="Minimum number of pixels in a detected cluster to accept a corner candidate."
                    value={config.minClusterSize}
                    onChange={(v) => set("minClusterSize", v ?? 2)}
                    disabled={disabled}
                    min={1}
                    max={10}
                    step={1}
                />
                <CheckboxField
                    label="Broad mode"
                    tooltip="Enable broader search window for better recall at the cost of more false positives."
                    checked={config.broadMode}
                    onChange={(v) => set("broadMode", v)}
                    disabled={disabled}
                />
            </Section>
            <CollapsibleSection title="Pyramid" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Pyramid levels"
                    tooltip="Number of image pyramid levels for multiscale detection."
                    value={config.pyramidLevels}
                    onChange={(v) => set("pyramidLevels", v ?? 4)}
                    disabled={disabled}
                    min={1}
                    max={6}
                    step={1}
                />
                <NumberField
                    label="Pyramid min size"
                    tooltip="Minimum image dimension at the coarsest pyramid level (pixels)."
                    value={config.pyramidMinSize}
                    onChange={(v) => set("pyramidMinSize", v ?? 128)}
                    disabled={disabled}
                    min={32}
                    max={1024}
                    step={16}
                />
            </CollapsibleSection>
            <CollapsibleSection title="Advanced" columns={modal ? 2 : undefined}>
                <SelectField
                    label="Upscale factor"
                    tooltip="Optional upscaling before detection. 0 = off; 2/3/4× for detecting corners in very small images."
                    value={String(config.upscaleFactor) as "0" | "2" | "3" | "4"}
                    onChange={(v) => set("upscaleFactor", Number(v))}
                    disabled={disabled}
                    options={upscaleOptions}
                    presentation="select"
                />
                <SelectField
                    label="Refiner"
                    tooltip="Subpixel refinement method applied after initial corner detection."
                    value={config.refiner}
                    onChange={(v) => set("refiner", v)}
                    disabled={disabled}
                    options={refinerOptions}
                    presentation="select"
                />
            </CollapsibleSection>
        </>
    );
};

export default ChessCornersConfigForm;
