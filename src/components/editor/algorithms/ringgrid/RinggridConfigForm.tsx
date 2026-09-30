import { Checkbox, Disclosure, Field, InfoHint, NumberInput, Section, SegmentedControl } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../../lib/fieldBindings";
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

    const profileOptions: ChoiceOption<RinggridConfig["profile"]>[] = [
        { value: "baseline", label: "Baseline (893)" },
        { value: "extended", label: "Extended (2180)" },
    ];

    return (
        <>
            <Section title="Grid layout">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Rows"
                        as="group"
                        annotation={<InfoHint label="About rows">Number of hex-lattice rows.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Rows"
                            {...numberInputProps(config.rows, (v) => set("rows", v ?? 15))}
                            disabled={disabled}
                            min={1}
                            max={200}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Long row cols"
                        as="group"
                        annotation={<InfoHint label="About long row cols">Number of markers in the longest row.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Long row cols"
                            {...numberInputProps(config.longRowCols, (v) => set("longRowCols", v ?? 14))}
                            disabled={disabled}
                            min={1}
                            max={200}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Pitch"
                        as="group"
                        annotation={<InfoHint label="About pitch">Center-to-center distance between adjacent markers in millimeters.</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Pitch"
                            {...numberInputProps(config.pitchMm, (v) => set("pitchMm", v ?? 8.0))}
                            disabled={disabled}
                            min={0.1}
                            step={0.5}
                        />
                    </Field>
                </div>
            </Section>
            <Section title="Marker geometry">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Outer radius"
                        as="group"
                        annotation={<InfoHint label="About outer radius">Radius of the outer ring in millimeters.</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Outer radius"
                            {...numberInputProps(config.markerOuterRadiusMm, (v) => set("markerOuterRadiusMm", v ?? 5.6))}
                            disabled={disabled}
                            min={0.1}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Inner radius"
                        as="group"
                        annotation={<InfoHint label="About inner radius">Radius of the inner ring in millimeters.</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Inner radius"
                            {...numberInputProps(config.markerInnerRadiusMm, (v) => set("markerInnerRadiusMm", v ?? 3.2))}
                            disabled={disabled}
                            min={0.1}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Ring width"
                        as="group"
                        annotation={<InfoHint label="About ring width">Stroke width of both concentric rings in millimeters.</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Ring width"
                            {...numberInputProps(config.markerRingWidthMm, (v) => set("markerRingWidthMm", v ?? 0.8))}
                            disabled={disabled}
                            min={0.1}
                            step={0.1}
                        />
                    </Field>
                </div>
            </Section>
            <Section title="Codebook">
                <div className={fieldGridClass()}>
                    <Field
                        label="Profile"
                        as="group"
                        annotation={<InfoHint label="About profile">{"Baseline: 893 codes, cyclic Hamming distance >= 2. Extended: 2180 codes, distance >= 1."}</InfoHint>}
                    >
                        <SegmentedControl
                            aria-label="Profile"
                            {...choiceProps(config.profile, profileOptions, (v) => set("profile", v))}
                            disabled={disabled}
                        />
                    </Field>
                </div>
            </Section>
            <Disclosure summary="Detection scale">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Min diameter"
                        as="group"
                        annotation={<InfoHint label="About min diameter">Minimum expected marker diameter in pixels.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Min diameter"
                            {...numberInputProps(config.diameterMinPx, (v) => set("diameterMinPx", v ?? 14))}
                            disabled={disabled}
                            min={4}
                            max={500}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Max diameter"
                        as="group"
                        annotation={<InfoHint label="About max diameter">Maximum expected marker diameter in pixels.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Max diameter"
                            {...numberInputProps(config.diameterMaxPx, (v) => set("diameterMaxPx", v ?? 66))}
                            disabled={disabled}
                            min={4}
                            max={500}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Proposals">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Gradient threshold"
                        as="group"
                        annotation={<InfoHint label="About gradient threshold">Minimum gradient magnitude for proposal voting. Lower detects weaker features.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Gradient threshold"
                            {...numberInputProps(config.gradThreshold, (v) => set("gradThreshold", v ?? 0.05))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Decode">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Max decode distance"
                        as="group"
                        annotation={<InfoHint label="About max decode distance">Maximum Hamming distance for codebook matching.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max decode distance"
                            {...numberInputProps(config.maxDecodeDist, (v) => set("maxDecodeDist", v ?? 3))}
                            disabled={disabled}
                            min={0}
                            max={10}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min confidence"
                        as="group"
                        annotation={<InfoHint label="About min confidence">Minimum confidence score for decode acceptance.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min confidence"
                            {...numberInputProps(config.minDecodeConfidence, (v) => set("minDecodeConfidence", v ?? 0.3))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Advanced">
                <div className={fieldGridClass()}>
                    <div className="flex items-center gap-1.5">
                        <Checkbox
                            label="Marker completion"
                            checked={config.enableCompletion}
                            onCheckedChange={(v) => set("enableCompletion", v)}
                            disabled={disabled}
                        />
                        <InfoHint label="About marker completion">Attempt to recover missing markers using homography reprojection.</InfoHint>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Checkbox
                            label="Self-undistort"
                            checked={config.enableSelfUndistort}
                            onCheckedChange={(v) => set("enableSelfUndistort", v)}
                            disabled={disabled}
                        />
                        <InfoHint label="About self-undistort">Estimate and compensate for radial lens distortion during detection.</InfoHint>
                    </div>
                </div>
            </Disclosure>
        </>
    );
};

export default RinggridConfigForm;
