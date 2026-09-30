import { Checkbox, Disclosure, Field, InfoHint, NumberInput, Section, Select } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps } from "../../../../lib/fieldBindings";
import type { AlgorithmConfigFormProps } from "../types";

export interface ChessCornersConfig {
    threshold: number;
    nmsRadius: number;
    minClusterSize: number;
    broadMode: boolean;
    pyramidLevels: number;
    pyramidMinSize: number;
    upscaleFactor: number;
    refiner: "center_of_mass" | "forstner" | "saddle_point";
}

const refinerOptions = [
    { value: "center_of_mass" as const, label: "Center of mass" },
    { value: "forstner" as const, label: "Förstner" },
    { value: "saddle_point" as const, label: "Saddle point" },
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
            <Section title="Detection">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Response threshold"
                        as="group"
                        annotation={<InfoHint label="About response threshold">Absolute floor on the raw ChESS response (detector default 30). Lower values detect more corners but may increase false positives.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Response threshold"
                            {...numberInputProps(config.threshold, (v) => set("threshold", v ?? 30))}
                            disabled={disabled}
                            min={0}
                            max={500}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="NMS radius"
                        as="group"
                        annotation={<InfoHint label="About NMS radius">Non-maximum suppression radius in pixels. Prevents duplicate detections.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="NMS radius"
                            {...numberInputProps(config.nmsRadius, (v) => set("nmsRadius", v ?? 2))}
                            disabled={disabled}
                            min={1}
                            max={10}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min cluster size"
                        as="group"
                        annotation={<InfoHint label="About min cluster size">Minimum number of pixels in a detected cluster to accept a corner candidate.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min cluster size"
                            {...numberInputProps(config.minClusterSize, (v) => set("minClusterSize", v ?? 2))}
                            disabled={disabled}
                            min={1}
                            max={10}
                            step={1}
                        />
                    </Field>
                    <div className="flex items-center gap-1.5">
                        <Checkbox
                            label="Broad mode"
                            checked={config.broadMode}
                            onCheckedChange={(v) => set("broadMode", v)}
                            disabled={disabled}
                        />
                        <InfoHint label="About broad mode">Enable broader search window for better recall at the cost of more false positives.</InfoHint>
                    </div>
                </div>
            </Section>
            <Disclosure summary="Pyramid">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Pyramid levels"
                        as="group"
                        annotation={<InfoHint label="About pyramid levels">Number of image pyramid levels for multiscale detection.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Pyramid levels"
                            {...numberInputProps(config.pyramidLevels, (v) => set("pyramidLevels", v ?? 4))}
                            disabled={disabled}
                            min={1}
                            max={6}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Pyramid min size"
                        as="group"
                        annotation={<InfoHint label="About pyramid min size">Minimum image dimension at the coarsest pyramid level (pixels).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Pyramid min size"
                            {...numberInputProps(config.pyramidMinSize, (v) => set("pyramidMinSize", v ?? 128))}
                            disabled={disabled}
                            min={32}
                            max={1024}
                            step={16}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Advanced">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Upscale factor"
                        as="group"
                        annotation={<InfoHint label="About upscale factor">Optional upscaling before detection. 0 = off; 2/3/4× for detecting corners in very small images.</InfoHint>}
                    >
                        <Select
                            aria-label="Upscale factor"
                            {...choiceProps(String(config.upscaleFactor) as "0" | "2" | "3" | "4", upscaleOptions, (v) => set("upscaleFactor", Number(v)))}
                            disabled={disabled}
                        />
                    </Field>
                    <Field
                        label="Refiner"
                        as="group"
                        annotation={<InfoHint label="About refiner">Subpixel refinement method applied after initial corner detection.</InfoHint>}
                    >
                        <Select
                            aria-label="Refiner"
                            {...choiceProps(config.refiner, refinerOptions, (v) => set("refiner", v))}
                            disabled={disabled}
                        />
                    </Field>
                </div>
            </Disclosure>
        </>
    );
};

export default ChessCornersConfigForm;
