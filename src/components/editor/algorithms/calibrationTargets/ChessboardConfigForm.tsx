import { NumberField, Section } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface ChessboardConfig {
    expectedRows: number;
    expectedCols: number;
    minCornerStrength: number;
    completenessThreshold: number;
}

const ChessboardConfigForm = (props: AlgorithmConfigFormProps<ChessboardConfig>) => {
    const { config, onChange, disabled } = props;

    const set = <K extends keyof ChessboardConfig>(key: K, value: ChessboardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <Section title="Detector">
            <NumberField
                label="Expected rows"
                value={config.expectedRows}
                onChange={(v) => set("expectedRows", v ?? 7)}
                disabled={disabled}
                min={2}
                step={1}
            />
            <NumberField
                label="Expected cols"
                value={config.expectedCols}
                onChange={(v) => set("expectedCols", v ?? 11)}
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
                onChange={(v) => set("completenessThreshold", v ?? 0.1)}
                disabled={disabled}
                min={0}
                max={1}
                step={0.05}
            />
        </Section>
    );
};

export default ChessboardConfigForm;
