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
                    max={50}
                    step={1}
                    tooltip="Number of square rows on the board"
                />
                <NumberField
                    label="Cols"
                    value={config.cols}
                    onChange={(v) => update({ cols: v ?? 10 })}
                    disabled={false}
                    min={1}
                    max={50}
                    step={1}
                    tooltip="Number of square columns on the board"
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
                <NumberField
                    label="PNG DPI"
                    value={config.pngDpi}
                    onChange={(v) => update({ pngDpi: v ?? 300 })}
                    disabled={false}
                    min={72}
                    max={600}
                    step={1}
                    tooltip="Resolution of the generated PNG pattern"
                />
            </Section>
            <p className="text-xs text-muted-foreground px-1">
                Margin (5 mm) and dot diameter (1/3 edge) are fixed by the upstream pattern. PNG-only export.
            </p>
        </>
    );
}
