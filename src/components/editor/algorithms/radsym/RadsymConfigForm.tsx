import { NumberField, Section, SelectField, type FieldOption } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface RadsymConfig {
    minRadius: number;
    maxRadius: number;
    alpha: number;
    gradientThreshold: number;
    smoothingFactor: number;
    nmsRadius: number;
    nmsThreshold: number;
    maxDetections: number;
    polarity: "bright" | "dark" | "both";
    gradientOperator: "sobel" | "scharr";
}

const polarityOptions: FieldOption<RadsymConfig["polarity"]>[] = [
    { value: "both", label: "Both (bright & dark)" },
    { value: "bright", label: "Bright circles" },
    { value: "dark", label: "Dark circles" },
];

const gradientOptions: FieldOption<RadsymConfig["gradientOperator"]>[] = [
    { value: "sobel", label: "Sobel" },
    { value: "scharr", label: "Scharr" },
];

const RadsymConfigForm = (props: AlgorithmConfigFormProps<RadsymConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof RadsymConfig>(key: K, value: RadsymConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Radius range" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Min radius (px)"
                    tooltip="Smallest circle radius to detect in pixels."
                    value={config.minRadius}
                    onChange={(v) => set("minRadius", v ?? 3)}
                    disabled={disabled}
                    min={1}
                    max={500}
                    step={1}
                />
                <NumberField
                    label="Max radius (px)"
                    tooltip="Largest circle radius to detect in pixels."
                    value={config.maxRadius}
                    onChange={(v) => set("maxRadius", v ?? 50)}
                    disabled={disabled}
                    min={1}
                    max={500}
                    step={1}
                />
            </Section>
            <Section title="Detection" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Alpha"
                    tooltip="Radial strictness exponent. Higher = stricter radial symmetry."
                    value={config.alpha}
                    onChange={(v) => set("alpha", v ?? 2.0)}
                    disabled={disabled}
                    min={0.5}
                    max={10}
                    step={0.5}
                />
                <NumberField
                    label="Gradient threshold"
                    tooltip="Minimum gradient magnitude to cast votes. 0 = no threshold."
                    value={config.gradientThreshold}
                    onChange={(v) => set("gradientThreshold", v ?? 0)}
                    disabled={disabled}
                    min={0}
                    max={255}
                    step={1}
                />
                <NumberField
                    label="Smoothing"
                    tooltip="Gaussian smoothing factor (kn). Higher = smoother vote maps."
                    value={config.smoothingFactor}
                    onChange={(v) => set("smoothingFactor", v ?? 0.5)}
                    disabled={disabled}
                    min={0.1}
                    max={5}
                    step={0.1}
                />
                <SelectField
                    label="Polarity"
                    tooltip="Detect bright circles, dark circles, or both."
                    value={config.polarity}
                    onChange={(v) => set("polarity", v)}
                    disabled={disabled}
                    options={polarityOptions}
                />
            </Section>
            <Section title="Post-processing" columns={modal ? 2 : undefined}>
                <NumberField
                    label="NMS radius"
                    tooltip="Non-maximum suppression radius in pixels."
                    value={config.nmsRadius}
                    onChange={(v) => set("nmsRadius", v ?? 5)}
                    disabled={disabled}
                    min={1}
                    max={100}
                    step={1}
                />
                <NumberField
                    label="NMS threshold"
                    tooltip="Minimum score to keep after NMS. 0 = keep all."
                    value={config.nmsThreshold}
                    onChange={(v) => set("nmsThreshold", v ?? 0)}
                    disabled={disabled}
                    min={0}
                    step={0.1}
                />
                <NumberField
                    label="Max detections"
                    tooltip="Maximum number of circles to return."
                    value={config.maxDetections}
                    onChange={(v) => set("maxDetections", v ?? 50)}
                    disabled={disabled}
                    min={1}
                    max={1000}
                    step={1}
                />
                <SelectField
                    label="Gradient"
                    tooltip="Gradient operator for edge detection."
                    value={config.gradientOperator}
                    onChange={(v) => set("gradientOperator", v)}
                    disabled={disabled}
                    options={gradientOptions}
                />
            </Section>
        </>
    );
};

export default RadsymConfigForm;
