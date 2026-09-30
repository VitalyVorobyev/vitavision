import { Disclosure, Field, InfoHint, NumberInput, Section, Select } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../lib/fieldBindings";
import type { RingGridConfig, RingGridProfile, TargetGeneratorAction } from "../types";

interface Props {
    config: RingGridConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

const PROFILE_OPTIONS: ChoiceOption<RingGridProfile>[] = [
    { value: "baseline", label: "Baseline" },
    { value: "extended", label: "Extended" },
];

export default function RingGridGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<RingGridConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
        <>
            <Section title="Ring Grid">
                <div className={fieldGridClass(2)}>
                    <Field
                        label="Rows"
                        as="group"
                        annotation={<InfoHint label="About rows">Number of hex-lattice rows</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Rows"
                            {...numberInputProps(config.rows, (v) => update({ rows: v ?? 15 }))}
                            min={1}
                            max={50}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Long row cols"
                        as="group"
                        annotation={<InfoHint label="About long row cols">Number of columns in the longest row</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Long row cols"
                            {...numberInputProps(config.longRowCols, (v) => update({ longRowCols: v ?? 14 }))}
                            min={1}
                            max={50}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Pitch"
                        as="group"
                        annotation={<InfoHint label="About pitch">Center-to-center hex pitch in millimeters</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Pitch"
                            {...numberInputProps(config.pitchMm, (v) => update({ pitchMm: v ?? 8 }))}
                            min={2}
                            max={50}
                            step={0.5}
                        />
                    </Field>
                    <Field
                        label="Codebook profile"
                        as="group"
                        annotation={<InfoHint label="About codebook profile">Baseline: 893 markers (min cyclic Hamming dist 2). Extended: 2180 markers (min dist 1).</InfoHint>}
                    >
                        <Select
                            aria-label="Codebook profile"
                            {...choiceProps(config.profile, PROFILE_OPTIONS, (v) => update({ profile: v }))}
                        />
                    </Field>
                </div>
            </Section>
            <Disclosure summary="Marker geometry">
                <div className={fieldGridClass(2)}>
                    <Field
                        label="Outer radius"
                        as="group"
                        annotation={<InfoHint label="About outer radius">Outer ring center radius in millimeters</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Outer radius"
                            {...numberInputProps(config.markerOuterRadiusMm, (v) => update({ markerOuterRadiusMm: v ?? 5.6 }))}
                            min={0.5}
                            max={25}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Inner radius"
                        as="group"
                        annotation={<InfoHint label="About inner radius">Inner ring center radius in millimeters</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Inner radius"
                            {...numberInputProps(config.markerInnerRadiusMm, (v) => update({ markerInnerRadiusMm: v ?? 3.2 }))}
                            min={0.5}
                            max={25}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Ring width"
                        as="group"
                        annotation={<InfoHint label="About ring width">Stroke width of both concentric rings</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Ring width"
                            {...numberInputProps(config.markerRingWidthMm, (v) => update({ markerRingWidthMm: v ?? 0.8 }))}
                            min={0.1}
                            max={5}
                            step={0.05}
                        />
                    </Field>
                </div>
            </Disclosure>
        </>
    );
}
