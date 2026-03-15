import type { AlgorithmConfigFormProps } from "../types";

export interface ChessCornersConfig {
    thresholdRel: number;
    useMlRefiner: boolean;
}

const ChessCornersConfigForm = (props: AlgorithmConfigFormProps<ChessCornersConfig>) => {
    const { config, onChange, disabled } = props;

    return (
        <div className="space-y-3">
            <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground" title="Relative detection threshold (0.05-0.8). Lower values detect more corners but increase false positives.">
                    Threshold (relative): {config.thresholdRel.toFixed(2)}
                </span>
                <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.01}
                    value={config.thresholdRel}
                    disabled={disabled}
                    onChange={(event) => {
                        onChange({
                            ...config,
                            thresholdRel: Number(event.target.value),
                        });
                    }}
                />
            </label>

            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                    type="checkbox"
                    checked={config.useMlRefiner}
                    disabled={disabled}
                    onChange={(event) => {
                        onChange({
                            ...config,
                            useMlRefiner: event.target.checked,
                        });
                    }}
                />
                <span title="Apply an ML-based subpixel refinement model to improve corner localization accuracy.">Use ML refiner</span>
            </label>
        </div>
    );
};

export default ChessCornersConfigForm;
