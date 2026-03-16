import { Section, NumberField } from "../../editor/algorithms/formFields";
import type { MarkerBoardConfig, TargetGeneratorAction } from "../types";

interface Props {
    config: MarkerBoardConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function MarkerBoardGenConfig({ config, dispatch }: Props) {
    const update = (partial: Partial<MarkerBoardConfig>) =>
        dispatch({ type: "UPDATE_CONFIG", partial });

    return (
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
    );
}
