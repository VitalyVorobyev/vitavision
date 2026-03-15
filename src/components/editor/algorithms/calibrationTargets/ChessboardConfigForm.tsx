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
                tooltip="Number of internal corner rows in the chessboard pattern (squares minus one)."
                value={config.expectedRows}
                onChange={(v) => set("expectedRows", v ?? 7)}
                disabled={disabled}
                min={2}
                step={1}
            />
            <NumberField
                label="Expected cols"
                tooltip="Number of internal corner columns in the chessboard pattern (squares minus one)."
                value={config.expectedCols}
                onChange={(v) => set("expectedCols", v ?? 11)}
                disabled={disabled}
                min={2}
                step={1}
            />
            <NumberField
                label="Min corner strength"
                tooltip="Minimum ChESS response threshold (0-1). Lower values detect weaker corners but may increase false positives."
                value={config.minCornerStrength}
                onChange={(v) => set("minCornerStrength", v ?? 0.2)}
                disabled={disabled}
                min={0}
                max={1}
                step={0.05}
            />
            <NumberField
                label="Completeness threshold"
                tooltip="Fraction of expected corners that must be detected for the board to be accepted (0-1)."
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
