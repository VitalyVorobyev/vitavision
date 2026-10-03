import { Field, InfoHint, NumberInput, Section, Select } from "@vitavision/ui";
import { fieldGridClass, numberInputProps } from "../../../lib/fieldBindings";
import type { PuzzlepoleConfig, TargetGeneratorAction } from "../types";
import {
    PUZZLEPOLE_MAX_AXIAL_SQUARES,
    PUZZLEPOLE_MIN_AXIAL_SQUARES,
    puzzlepoleBoardSizeMm,
    puzzlepoleCircumferences,
    puzzlepoleCylinderDiameterMm,
    puzzlepoleStartRows,
    type PuzzlepolePeriod,
} from "../puzzlepole/geometry";

interface Props {
    config: PuzzlepoleConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    /**
     * The library's supported `[circumference_squares, start_row]` pairs
     * (`puzzlepole_periods()`). Injected rather than fetched here: reading them
     * goes through the WASM worker, which a design-synced panel must not import.
     * Until they arrive (or in a design render, where they never do) the
     * circumference and start row fall back to plain number fields and
     * validation still rejects an unsupported value.
     */
    periods?: readonly PuzzlepolePeriod[];
}

export default function PuzzlepoleGenConfig({ config, dispatch, periods }: Props) {
    const update = (partial: Partial<PuzzlepoleConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    const circumferences = periods ? puzzlepoleCircumferences(periods) : [];
    const startRows = periods ? puzzlepoleStartRows(periods, config.circumferenceSquares) : [];
    const board = puzzlepoleBoardSizeMm(config);
    const diameterMm = puzzlepoleCylinderDiameterMm(config);

    // A start row is only meaningful for one circumference, so changing the
    // circumference re-seats it on that circumference's first listed seam.
    const setCircumference = (circumferenceSquares: number) => {
        const first = periods ? puzzlepoleStartRows(periods, circumferenceSquares)[0] : undefined;
        update(first === undefined ? { circumferenceSquares } : { circumferenceSquares, startRow: first });
    };

    return (
        <>
            <Section title="PuzzlePole">
                <div className={fieldGridClass(2)}>
                    <Field
                        label="Around"
                        as="group"
                        annotation={
                            <InfoHint label="About circumference">
                                Squares around the cylinder. Only a few values close seamlessly, so they come from the library.
                            </InfoHint>
                        }
                    >
                        {circumferences.length > 0 ? (
                            <Select
                                aria-label="Squares around the circumference"
                                value={String(config.circumferenceSquares)}
                                options={circumferences.map((n) => ({ value: String(n), label: `${n} squares` }))}
                                onValueChange={(v) => setCircumference(Number(v))}
                            />
                        ) : (
                            <NumberInput
                                aria-label="Squares around the circumference"
                                {...numberInputProps(config.circumferenceSquares, (v) => update({ circumferenceSquares: v ?? 12 }))}
                                min={1}
                                step={1}
                            />
                        )}
                    </Field>
                    <Field
                        label="Seam row"
                        as="group"
                        annotation={
                            <InfoHint label="About seam row">
                                Master-pattern row the strip is cut from. Each listed row closes seamlessly for this circumference.
                            </InfoHint>
                        }
                    >
                        {startRows.length > 0 ? (
                            <Select
                                aria-label="Seam row"
                                value={String(config.startRow)}
                                options={startRows.map((n) => ({ value: String(n), label: String(n) }))}
                                onValueChange={(v) => update({ startRow: Number(v) })}
                            />
                        ) : (
                            <NumberInput
                                aria-label="Seam row"
                                {...numberInputProps(config.startRow, (v) => update({ startRow: v ?? 0 }))}
                                min={0}
                                step={1}
                            />
                        )}
                    </Field>
                    <Field
                        label="Along"
                        as="group"
                        annotation={
                            <InfoHint label="About axial squares">
                                Squares along the cylinder axis ({PUZZLEPOLE_MIN_AXIAL_SQUARES} to {PUZZLEPOLE_MAX_AXIAL_SQUARES}).
                            </InfoHint>
                        }
                    >
                        <NumberInput
                            aria-label="Squares along the axis"
                            {...numberInputProps(config.axialSquares, (v) => update({ axialSquares: v ?? 10 }))}
                            min={PUZZLEPOLE_MIN_AXIAL_SQUARES}
                            max={PUZZLEPOLE_MAX_AXIAL_SQUARES}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Square size"
                        as="group"
                        annotation={<InfoHint label="About square size">Side length of each square in millimeters</InfoHint>}
                    >
                        <NumberInput
                            unit="mm"
                            aria-label="Square size"
                            {...numberInputProps(config.squareSizeMm, (v) => update({ squareSizeMm: v ?? 10 }))}
                            min={1}
                            max={100}
                            step={0.5}
                        />
                    </Field>
                </div>
            </Section>
            <p className="text-xs text-fg-muted px-1">
                Wraps a cylinder of about {diameterMm.toFixed(1)} mm diameter (circumference {config.circumferenceSquares} × {config.squareSizeMm} mm).
                The printed strip is {board.widthMm.toFixed(0)} × {board.heightMm.toFixed(0)} mm: print at 100 % scale, then roll it around the cylinder.
                Margin (5 mm) and dot diameter (1/3 edge) are fixed by the upstream pattern.
            </p>
        </>
    );
}
