import { Disclosure, Field, InfoHint, NumberInput, Section } from "@vitavision/ui";
import { fieldGridClass, numberInputProps } from "../../../../lib/fieldBindings";
import type { AlgorithmConfigFormProps } from "../types";

export interface ChessboardConfig {
    expectedRows: number;
    expectedCols: number;
    minCornerStrength: number;
    completenessThreshold: number;
    maxFitRmsRatio: number;
    peakMinSeparationDeg: number;
    minPeakWeightFraction: number;
}

const ChessboardConfigForm = (props: AlgorithmConfigFormProps<ChessboardConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof ChessboardConfig>(key: K, value: ChessboardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board size">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Expected rows"
                        as="group"
                        annotation={<InfoHint label="About expected rows">Number of internal corner rows in the chessboard pattern (squares minus one).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Expected rows"
                            {...numberInputProps(config.expectedRows, (v) => set("expectedRows", v ?? 7))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Expected cols"
                        as="group"
                        annotation={<InfoHint label="About expected cols">Number of internal corner columns in the chessboard pattern (squares minus one).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Expected cols"
                            {...numberInputProps(config.expectedCols, (v) => set("expectedCols", v ?? 11))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                </div>
            </Section>
            <Disclosure summary="Detector tuning">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Min corner strength"
                        as="group"
                        annotation={<InfoHint label="About min corner strength">Absolute floor on the raw ChESS response (detector default 15). Lower values detect weaker corners but may increase false positives.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min corner strength"
                            {...numberInputProps(config.minCornerStrength, (v) => set("minCornerStrength", v ?? 15))}
                            disabled={disabled}
                            min={0}
                            max={500}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Completeness threshold"
                        as="group"
                        annotation={<InfoHint label="About completeness threshold">Fraction of expected corners that must be detected for the board to be accepted (0-1).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Completeness threshold"
                            {...numberInputProps(config.completenessThreshold, (v) => set("completenessThreshold", v ?? 0.1))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Advanced">
                <div className={fieldGridClass(modal ? 2 : undefined)}>
                    <Field
                        label="Max fit RMS ratio"
                        as="group"
                        annotation={<InfoHint label="About max fit RMS ratio">Maximum RMS residual (relative to board scale) for a corner-fit cluster to be accepted. Lower → stricter; raise if the detector rejects clearly-good boards. WASM default: 0.5.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max fit RMS ratio"
                            {...numberInputProps(config.maxFitRmsRatio, (v) => set("maxFitRmsRatio", v ?? 0.5))}
                            disabled={disabled}
                            min={0.05}
                            max={2}
                            step={0.05}
                        />
                    </Field>
                    <Field
                        label="Peak min separation"
                        as="group"
                        annotation={<InfoHint label="About peak min separation">Minimum angular separation between dominant edge orientations. Higher → only well-separated grid axes accepted. WASM default: 60.</InfoHint>}
                    >
                        <NumberInput
                            unit="°"
                            aria-label="Peak min separation"
                            {...numberInputProps(config.peakMinSeparationDeg, (v) => set("peakMinSeparationDeg", v ?? 60))}
                            disabled={disabled}
                            min={10}
                            max={90}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min peak weight fraction"
                        as="group"
                        annotation={<InfoHint label="About min peak weight fraction">Minimum fractional weight a peak must carry in the orientation histogram. Lower → accept weaker peaks (helps with low-contrast boards). WASM default: 0.02.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min peak weight fraction"
                            {...numberInputProps(config.minPeakWeightFraction, (v) => set("minPeakWeightFraction", v ?? 0.02))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.005}
                        />
                    </Field>
                </div>
            </Disclosure>
        </>
    );
};

export default ChessboardConfigForm;
