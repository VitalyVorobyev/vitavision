import { CollapsibleSection, NumberField, Section } from "../formFields";
import type { AlgorithmConfigFormProps } from "../types";

export interface ChessboardConfig {
    expectedRows: number;
    expectedCols: number;
    minCornerStrength: number;
    completenessThreshold: number;
    maxFitRmsRatio: number;
    peakMinSeparationDeg: number;
    minPeakWeightFraction: number;
}

const ChessboardConfigForm = (props: AlgorithmConfigFormProps<ChessboardConfig>) => {
    const { config, onChange, disabled, modal } = props;

    const set = <K extends keyof ChessboardConfig>(key: K, value: ChessboardConfig[K]) =>
        onChange({ ...config, [key]: value });

    return (
        <>
            <Section title="Board size" columns={modal ? 2 : undefined}>
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
            </Section>
            <CollapsibleSection title="Detector tuning" columns={modal ? 2 : undefined}>
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
            </CollapsibleSection>
            <CollapsibleSection title="Advanced" columns={modal ? 2 : undefined}>
                <NumberField
                    label="Max fit RMS ratio"
                    tooltip="Maximum RMS residual (relative to board scale) for a corner-fit cluster to be accepted. Lower → stricter; raise if the detector rejects clearly-good boards. WASM default: 0.5."
                    value={config.maxFitRmsRatio}
                    onChange={(v) => set("maxFitRmsRatio", v ?? 0.5)}
                    disabled={disabled}
                    min={0.05}
                    max={2}
                    step={0.05}
                />
                <NumberField
                    label="Peak min separation (°)"
                    tooltip="Minimum angular separation between dominant edge orientations. Higher → only well-separated grid axes accepted. WASM default: 60."
                    value={config.peakMinSeparationDeg}
                    onChange={(v) => set("peakMinSeparationDeg", v ?? 60)}
                    disabled={disabled}
                    min={10}
                    max={90}
                    step={1}
                />
                <NumberField
                    label="Min peak weight fraction"
                    tooltip="Minimum fractional weight a peak must carry in the orientation histogram. Lower → accept weaker peaks (helps with low-contrast boards). WASM default: 0.02."
                    value={config.minPeakWeightFraction}
                    onChange={(v) => set("minPeakWeightFraction", v ?? 0.02)}
                    disabled={disabled}
                    min={0}
                    max={1}
                    step={0.005}
                />
            </CollapsibleSection>
        </>
    );
};

export default ChessboardConfigForm;
