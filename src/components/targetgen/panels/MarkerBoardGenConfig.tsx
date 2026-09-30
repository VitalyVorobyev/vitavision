import { Button, Field, InfoHint, NumberInput, Section } from "@vitavision/ui";
import { fieldGridClass, numberInputProps } from "../../../lib/fieldBindings";
import type { MarkerBoardConfig, CircleSpec, TargetGeneratorAction } from "../types";
import { defaultCircles } from "../reducer";

interface Props {
    config: MarkerBoardConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function MarkerBoardGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<MarkerBoardConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    const totalRows = config.innerRows + 1;
    const totalCols = config.innerCols + 1;

    const updateCircleCell = (idx: number, field: "i" | "j", value: number) => {
        const next = config.circles.map((c, n) =>
            n === idx ? { cell: { ...c.cell, [field]: value } } : c,
        ) as [CircleSpec, CircleSpec, CircleSpec];
        update({ circles: next });
    };

    const resetCircles = () => {
        update({ circles: defaultCircles(config.innerRows, config.innerCols) });
    };

    /** Polarity label for display: derived from square color. */
    const polarityLabel = (c: CircleSpec) =>
        (c.cell.i + c.cell.j) % 2 === 0 ? "white" : "black";

    return (
        <>
            <Section title="Marker Board">
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
                        label="Circle diameter"
                        as="group"
                        annotation={<InfoHint label="About circle diameter">Circle diameter relative to square size</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Circle diameter"
                            {...numberInputProps(config.circleDiameterRel, (v) => update({ circleDiameterRel: v ?? 0.5 }))}
                            min={0.1}
                            max={0.99}
                            step={0.05}
                        />
                    </Field>
                </div>
            </Section>

            <Section title="Circle Markers">
                <div className={fieldGridClass()}>
                    <div className="col-span-full space-y-2">
                        <p className="text-[10px] text-fg-muted">
                            Click a square on the preview to move the nearest circle there. Polarity is automatic (contrasts with square color).
                        </p>
                        {config.circles.map((circ, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Field label="Row">
                                    <NumberInput
                                        {...numberInputProps(circ.cell.i, (v) => updateCircleCell(idx, "i", v ?? 0))}
                                        min={0}
                                        max={totalRows - 1}
                                        step={1}
                                    />
                                </Field>
                                <Field label="Col">
                                    <NumberInput
                                        {...numberInputProps(circ.cell.j, (v) => updateCircleCell(idx, "j", v ?? 0))}
                                        min={0}
                                        max={totalCols - 1}
                                        step={1}
                                    />
                                </Field>
                                <span className="mt-5 text-[10px] text-fg-muted w-10 shrink-0">
                                    {polarityLabel(circ)}
                                </span>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <Button size="sm" onClick={resetCircles}>
                                Reset to default
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
}
