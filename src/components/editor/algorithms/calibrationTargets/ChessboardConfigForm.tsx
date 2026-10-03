import { Field, InfoHint, NumberInput, Section } from "@vitavision/ui";
import { fieldGridClass, numberInputProps } from "../../../../lib/fieldBindings";
import type { AlgorithmConfigFormProps } from "../types";

// calib-targets 0.15's ChessboardParams has exactly these three stable keys
// (default_chessboard_params() = { min_labeled_corners, max_components,
// min_corner_strength }). The board's size is not a detector input — the
// detector labels whatever grid it finds — and the fields this form used to
// offer for it (expected rows/cols, completeness, orientation clustering,
// grid graph) were silently dropped by the WASM boundary.
export interface ChessboardConfig {
    minCornerStrength: number;
    minLabeledCorners: number;
    maxComponents: number;
}

const ChessboardConfigForm = (props: AlgorithmConfigFormProps<ChessboardConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof ChessboardConfig>(key: K, value: ChessboardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <Section title="Chessboard detector">
            <div className={fieldGridClass(modal ? 2 : undefined)}>
                <Field
                    label="Min corner strength"
                    as="group"
                    annotation={<InfoHint label="About min corner strength">Absolute floor on the raw ChESS response. Lower values detect weaker corners but may increase false positives.</InfoHint>}
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
                    label="Min labeled corners"
                    as="group"
                    annotation={<InfoHint label="About min labeled corners">Fewest grid-labeled corners a detected board component may have. Raise it to ignore small fragments. Library default: 8.</InfoHint>}
                >
                    <NumberInput
                        aria-label="Min labeled corners"
                        {...numberInputProps(config.minLabeledCorners, (v) => set("minLabeledCorners", v ?? 8))}
                        disabled={disabled}
                        min={1}
                        step={1}
                    />
                </Field>
                <Field
                    label="Max components"
                    as="group"
                    annotation={<InfoHint label="About max components">Most separate grid components returned per image. Library default: 3.</InfoHint>}
                >
                    <NumberInput
                        aria-label="Max components"
                        {...numberInputProps(config.maxComponents, (v) => set("maxComponents", v ?? 3))}
                        disabled={disabled}
                        min={1}
                        step={1}
                    />
                </Field>
            </div>
        </Section>
    );
};

export default ChessboardConfigForm;
