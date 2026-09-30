import { Field, InfoHint, NumberInput, Section } from "@vitavision/ui";
import { fieldGridClass, numberInputProps } from "../../../lib/fieldBindings";
import type { ChessboardConfig, TargetGeneratorAction } from "../types";

interface Props {
    config: ChessboardConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function ChessboardGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<ChessboardConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
        <Section title="Chessboard">
            <div className={fieldGridClass(2)}>
                <Field
                    label="Inner rows"
                    as="group"
                    annotation={<InfoHint label="About inner rows">Number of inner corner rows</InfoHint>}
                >
                    <NumberInput
                        aria-label="Inner rows"
                        {...numberInputProps(config.innerRows, (v) => update({ innerRows: v ?? 7 }))}
                        min={1}
                        max={100}
                        step={1}
                    />
                </Field>
                <Field
                    label="Inner cols"
                    as="group"
                    annotation={<InfoHint label="About inner cols">Number of inner corner columns</InfoHint>}
                >
                    <NumberInput
                        aria-label="Inner cols"
                        {...numberInputProps(config.innerCols, (v) => update({ innerCols: v ?? 10 }))}
                        min={1}
                        max={100}
                        step={1}
                    />
                </Field>
                <Field
                    label="Square size"
                    as="group"
                    annotation={<InfoHint label="About square size">Physical size of each square in millimeters</InfoHint>}
                >
                    <NumberInput
                        unit="mm"
                        aria-label="Square size"
                        {...numberInputProps(config.squareSizeMm, (v) => update({ squareSizeMm: v ?? 20 }))}
                        min={1}
                        max={500}
                        step={0.5}
                    />
                </Field>
                <Field
                    label="Inner square"
                    as="group"
                    annotation={<InfoHint label="About inner square">White square inside black squares (0 = off). For laser calibration targets.</InfoHint>}
                >
                    <NumberInput
                        aria-label="Inner square"
                        {...numberInputProps(config.innerSquareRel, (v) => update({ innerSquareRel: v ?? 0 }))}
                        min={0}
                        max={0.95}
                        step={0.05}
                    />
                </Field>
            </div>
        </Section>
    );
}
