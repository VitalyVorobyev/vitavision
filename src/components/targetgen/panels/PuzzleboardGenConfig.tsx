import { Field, InfoHint, NumberInput, Section } from "@vitavision/ui";
import { fieldGridClass, numberInputProps } from "../../../lib/fieldBindings";
import type { PuzzleboardConfig, TargetGeneratorAction } from "../types";

interface Props {
    config: PuzzleboardConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function PuzzleboardGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<PuzzleboardConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
        <>
            <Section title="PuzzleBoard">
                <div className={fieldGridClass(2)}>
                    <Field
                        label="Rows"
                        as="group"
                        annotation={<InfoHint label="About rows">Number of square rows on the board (max 501 — the master pattern's period)</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Rows"
                            {...numberInputProps(config.rows, (v) => update({ rows: v ?? 7 }))}
                            min={1}
                            max={501}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cols"
                        as="group"
                        annotation={<InfoHint label="About cols">Number of square columns on the board (max 501 — the master pattern's period)</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Cols"
                            {...numberInputProps(config.cols, (v) => update({ cols: v ?? 10 }))}
                            min={1}
                            max={501}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cell size"
                        as="group"
                        annotation={<InfoHint label="About cell size">Side length of each square cell in millimeters</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Cell size"
                            {...numberInputProps(config.cellSizeMm, (v) => update({ cellSizeMm: v ?? 15 }))}
                            min={1}
                            max={100}
                            step={0.5}
                        />
                    </Field>
                </div>
            </Section>
            <p className="text-xs text-fg-muted px-1">
                Margin (5 mm) and dot diameter (1/3 edge) are fixed by the upstream pattern.
            </p>
        </>
    );
}
