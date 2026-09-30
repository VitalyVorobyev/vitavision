import { Field, InfoHint, NumberInput, Section, SegmentedControl, Select } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../../lib/fieldBindings";
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
    algorithm: "frst" | "frst_fused" | "rsd" | "rsd_fused";
}

const polarityOptions: ChoiceOption<RadsymConfig["polarity"]>[] = [
    { value: "both", label: "Both" },
    { value: "bright", label: "Bright" },
    { value: "dark", label: "Dark" },
];

const gradientOptions: ChoiceOption<RadsymConfig["gradientOperator"]>[] = [
    { value: "sobel", label: "Sobel" },
    { value: "scharr", label: "Scharr" },
];

const algorithmOptions: ChoiceOption<RadsymConfig["algorithm"]>[] = [
    { value: "frst", label: "FRST (multi-radius)" },
    { value: "frst_fused", label: "FRST fused (faster)" },
    { value: "rsd", label: "RSD (magnitude-only)" },
    { value: "rsd_fused", label: "RSD fused (fastest)" },
];

const RadsymConfigForm = (props: AlgorithmConfigFormProps<RadsymConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof RadsymConfig>(key: K, value: RadsymConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Response algorithm">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Algorithm"
                        as="group"
                        annotation={<InfoHint label="About algorithm">Voting algorithm for the response map. FRST uses orientation; RSD uses magnitude only (~2× faster).</InfoHint>}
                    >
                        <Select
                            aria-label="Algorithm"
                            {...choiceProps(config.algorithm, algorithmOptions, (v) => set("algorithm", v))}
                            disabled={disabled}
                        />
                    </Field>
                </div>
            </Section>
            <Section title="Radius range">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Min radius"
                        as="group"
                        annotation={<InfoHint label="About min radius">Smallest voting radius in pixels.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Min radius"
                            {...numberInputProps(config.minRadius, (v) => set("minRadius", v ?? 3))}
                            disabled={disabled}
                            min={1}
                            max={500}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Max radius"
                        as="group"
                        annotation={<InfoHint label="About max radius">Largest voting radius in pixels.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Max radius"
                            {...numberInputProps(config.maxRadius, (v) => set("maxRadius", v ?? 50))}
                            disabled={disabled}
                            min={1}
                            max={500}
                            step={1}
                        />
                    </Field>
                </div>
            </Section>
            <Section title="Detection">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Alpha"
                        as="group"
                        annotation={<InfoHint label="About alpha">Radial strictness exponent. Higher = stricter radial symmetry. Only affects FRST.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Alpha"
                            {...numberInputProps(config.alpha, (v) => set("alpha", v ?? 2.0))}
                            disabled={disabled}
                            min={0.5}
                            max={10}
                            step={0.5}
                        />
                    </Field>
                    <Field
                        label="Gradient threshold"
                        as="group"
                        annotation={<InfoHint label="About gradient threshold">Minimum gradient magnitude to cast votes. 0 = no threshold.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Gradient threshold"
                            {...numberInputProps(config.gradientThreshold, (v) => set("gradientThreshold", v ?? 0))}
                            disabled={disabled}
                            min={0}
                            max={255}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Smoothing"
                        as="group"
                        annotation={<InfoHint label="About smoothing">Gaussian smoothing factor (kn). Higher = smoother vote maps.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Smoothing"
                            {...numberInputProps(config.smoothingFactor, (v) => set("smoothingFactor", v ?? 0.5))}
                            disabled={disabled}
                            min={0.1}
                            max={5}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Polarity"
                        as="group"
                        annotation={<InfoHint label="About polarity">Detect bright centers, dark centers, or both.</InfoHint>}
                    >
                        <SegmentedControl
                            aria-label="Polarity"
                            {...choiceProps(config.polarity, polarityOptions, (v) => set("polarity", v))}
                            disabled={disabled}
                        />
                    </Field>
                </div>
            </Section>
            <Section title="Post-processing">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="NMS radius"
                        as="group"
                        annotation={<InfoHint label="About NMS radius">Non-maximum suppression radius in pixels.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="NMS radius"
                            {...numberInputProps(config.nmsRadius, (v) => set("nmsRadius", v ?? 5))}
                            disabled={disabled}
                            min={1}
                            max={100}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="NMS threshold"
                        as="group"
                        annotation={<InfoHint label="About NMS threshold">Minimum score to keep after NMS. 0 = keep all.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="NMS threshold"
                            {...numberInputProps(config.nmsThreshold, (v) => set("nmsThreshold", v ?? 0))}
                            disabled={disabled}
                            min={0}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Max proposals"
                        as="group"
                        annotation={<InfoHint label="About max proposals">Maximum number of proposals to return.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max proposals"
                            {...numberInputProps(config.maxDetections, (v) => set("maxDetections", v ?? 50))}
                            disabled={disabled}
                            min={1}
                            max={1000}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Gradient"
                        as="group"
                        annotation={<InfoHint label="About gradient">Gradient operator for edge detection.</InfoHint>}
                    >
                        <SegmentedControl
                            aria-label="Gradient"
                            {...choiceProps(config.gradientOperator, gradientOptions, (v) => set("gradientOperator", v))}
                            disabled={disabled}
                        />
                    </Field>
                </div>
            </Section>
        </>
    );
};

export default RadsymConfigForm;
