import { NumberField, Section } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";
import type { MarkerCircleSpec } from "../../../../lib/api";

export interface MarkerBoardConfig {
    boardRows: number;
    boardCols: number;
    circles: MarkerCircleSpec[];
    expectedRows: number;
    expectedCols: number;
    minCornerStrength: number;
    completenessThreshold: number;
}

const MarkerBoardConfigForm = (props: AlgorithmConfigFormProps<MarkerBoardConfig>) => {
    const { config, onChange, disabled } = props;

    const set = <K extends keyof MarkerBoardConfig>(key: K, value: MarkerBoardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board">
                <NumberField
                    label="Rows"
                    value={config.boardRows}
                    onChange={(v) => set("boardRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Cols"
                    value={config.boardCols}
                    onChange={(v) => set("boardCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
            </Section>
            <Section title="Chessboard detector">
                <NumberField
                    label="Expected rows"
                    value={config.expectedRows}
                    onChange={(v) => set("expectedRows", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Expected cols"
                    value={config.expectedCols}
                    onChange={(v) => set("expectedCols", v ?? 22)}
                    disabled={disabled}
                    min={2}
                    step={1}
                />
                <NumberField
                    label="Min corner strength"
                    value={config.minCornerStrength}
                    onChange={(v) => set("minCornerStrength", v ?? 0.2)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <NumberField
                    label="Completeness threshold"
                    value={config.completenessThreshold}
                    onChange={(v) => set("completenessThreshold", v ?? 0.05)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.01}
                />
            </Section>
        </>
    );
};

export default MarkerBoardConfigForm;
