import { useMemo } from "react";
import { FieldLabel } from "./fieldChrome";
import { compactInputClass, touchInputClass, useFormControlMode } from "./controlMode";
import { shouldUseSegmentedControl } from "./numberUtils";

export interface FieldOption<TValue extends string> {
    value: TValue;
    label: string;
    shortLabel?: string;
}

export interface SelectFieldProps<TValue extends string> {
    label: string;
    value?: TValue;
    onChange: (next: TValue) => void;
    disabled: boolean;
    options: Array<FieldOption<TValue>>;
    tooltip?: string;
    presentation?: "auto" | "select" | "segmented";
}

export function SelectField<TValue extends string>(props: SelectFieldProps<TValue>) {
    const {
        label,
        value,
        onChange,
        disabled,
        options,
        tooltip,
        presentation = "auto",
    } = props;
    const controlMode = useFormControlMode();
    const currentValue = value ?? options[0]?.value ?? "";
    const useSegmented = useMemo(
        () => controlMode === "touch" && shouldUseSegmentedControl(options, presentation),
        [controlMode, options, presentation],
    );

    if (useSegmented) {
        return (
            <div className="grid gap-1">
                <FieldLabel label={label} tooltip={tooltip} />
                <div
                    className="grid gap-1 rounded-md border border-border bg-background p-1"
                    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
                    role="group"
                    aria-label={label}
                >
                    {options.map((option) => {
                        const active = option.value === currentValue;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onChange(option.value)}
                                disabled={disabled}
                                title={option.label}
                                aria-pressed={active}
                                aria-label={option.label}
                                className={`min-w-0 rounded-[calc(var(--radius-md)-2px)] px-3 py-2 text-sm font-medium transition-colors ${
                                    active
                                        ? "bg-primary/12 text-foreground shadow-xs"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                                <span className="block truncate">{option.shortLabel ?? option.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-1">
            <FieldLabel label={label} tooltip={tooltip} />
            <select
                value={currentValue}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value as TValue)}
                className={controlMode === "touch" ? touchInputClass : compactInputClass}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
