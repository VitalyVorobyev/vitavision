import { Plus, Trash2 } from "lucide-react";
import { Section, NumberField } from "../../editor/algorithms/formFields";
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
        );
        update({ circles: next });
    };

    const removeCircle = (idx: number) => {
        update({ circles: config.circles.filter((_, i) => i !== idx) });
    };

    const addCircle = () => {
        const occupied = new Set(config.circles.map((c) => `${c.cell.i},${c.cell.j}`));
        const ci = Math.floor(totalRows / 2);
        const cj = Math.floor(totalCols / 2);
        for (let d = 0; d < Math.max(totalRows, totalCols); d++) {
            for (let di = -d; di <= d; di++) {
                for (let dj = -d; dj <= d; dj++) {
                    const ni = ci + di;
                    const nj = cj + dj;
                    if (ni >= 0 && ni < totalRows && nj >= 0 && nj < totalCols) {
                        if (!occupied.has(`${ni},${nj}`)) {
                            update({ circles: [...config.circles, { cell: { i: ni, j: nj } }] });
                            return;
                        }
                    }
                }
            }
        }
    };

    const resetCircles = () => {
        update({ circles: defaultCircles(config.innerRows, config.innerCols) });
    };

    /** Polarity label for display: derived from square color. */
    const polarityLabel = (c: CircleSpec) =>
        (c.cell.i + c.cell.j) % 2 === 0 ? "white" : "black";

    return (
        <>
            <Section title="Marker Board" columns={2}>
                <NumberField
                    label="Inner rows"
                    value={config.innerRows}
                    onChange={(v) => update({ innerRows: v ?? 7 })}
                    disabled={false}
                    min={1}
                    max={100}
                    step={1}
                    tooltip="Number of inner corner rows"
                />
                <NumberField
                    label="Inner cols"
                    value={config.innerCols}
                    onChange={(v) => update({ innerCols: v ?? 10 })}
                    disabled={false}
                    min={1}
                    max={100}
                    step={1}
                    tooltip="Number of inner corner columns"
                />
                <NumberField
                    label="Square size (mm)"
                    value={config.squareSizeMm}
                    onChange={(v) => update({ squareSizeMm: v ?? 20 })}
                    disabled={false}
                    min={1}
                    max={500}
                    step={0.5}
                    tooltip="Physical size of each square in millimeters"
                />
                <NumberField
                    label="Circle diameter"
                    value={config.circleDiameterRel}
                    onChange={(v) => update({ circleDiameterRel: v ?? 0.5 })}
                    disabled={false}
                    min={0.1}
                    max={0.99}
                    step={0.05}
                    tooltip="Circle diameter relative to square size"
                />
            </Section>

            <Section title="Circle Markers">
                <div className="col-span-full space-y-2">
                    <p className="text-[10px] text-muted-foreground">
                        Click squares on the preview to place/remove circles. Polarity is automatic (contrasts with square color).
                    </p>
                    {config.circles.length === 0 && (
                        <p className="text-xs text-muted-foreground">No circles defined.</p>
                    )}
                    {config.circles.map((circ, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <NumberField
                                label="Row"
                                value={circ.cell.i}
                                onChange={(v) => updateCircleCell(idx, "i", v ?? 0)}
                                disabled={false}
                                min={0}
                                max={totalRows - 1}
                                step={1}
                            />
                            <NumberField
                                label="Col"
                                value={circ.cell.j}
                                onChange={(v) => updateCircleCell(idx, "j", v ?? 0)}
                                disabled={false}
                                min={0}
                                max={totalCols - 1}
                                step={1}
                            />
                            <span className="mt-5 text-[10px] text-muted-foreground w-10 shrink-0">
                                {polarityLabel(circ)}
                            </span>
                            <button
                                type="button"
                                className="mt-5 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => removeCircle(idx)}
                                title="Remove circle"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                            onClick={addCircle}
                        >
                            <Plus size={12} />
                            Add circle
                        </button>
                        <button
                            type="button"
                            className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
                            onClick={resetCircles}
                        >
                            Reset to default
                        </button>
                    </div>
                </div>
            </Section>
        </>
    );
}
