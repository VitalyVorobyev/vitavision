import { Section, NumberField } from "../../editor/algorithms/formFields";
import type { ChessboardConfig, TargetGeneratorAction } from "../types";

interface Props {
    config: ChessboardConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function ChessboardGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<ChessboardConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
        <Section title="Chessboard" columns={2}>
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
                label="Inner square"
                value={config.innerSquareRel}
                onChange={(v) => update({ innerSquareRel: v ?? 0 })}
                disabled={false}
                min={0}
                max={0.95}
                step={0.05}
                tooltip="White square inside black squares (0 = off). For laser calibration targets."
            />
        </Section>
    );
}
