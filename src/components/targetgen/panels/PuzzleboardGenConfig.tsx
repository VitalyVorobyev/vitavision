import { Section, NumberField } from "../../editor/algorithms/formFields";
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
            <Section title="PuzzleBoard" columns={2}>
                <NumberField
                    label="Rows"
                    value={config.rows}
                    onChange={(v) => update({ rows: v ?? 7 })}
                    disabled={false}
                    min={1}
                    max={501}
                    step={1}
                    tooltip="Number of square rows on the board (max 501 — the master pattern's period)"
                />
                <NumberField
                    label="Cols"
                    value={config.cols}
                    onChange={(v) => update({ cols: v ?? 10 })}
                    disabled={false}
                    min={1}
                    max={501}
                    step={1}
                    tooltip="Number of square columns on the board (max 501 — the master pattern's period)"
                />
                <NumberField
                    label="Cell size (mm)"
                    value={config.cellSizeMm}
                    onChange={(v) => update({ cellSizeMm: v ?? 15 })}
                    disabled={false}
                    min={1}
                    max={100}
                    step={0.5}
                    tooltip="Side length of each square cell in millimeters"
                />
            </Section>
            <p className="text-xs text-muted-foreground px-1">
                Margin (5 mm) and dot diameter (1/3 edge) are fixed by the upstream pattern.
            </p>
        </>
    );
}
