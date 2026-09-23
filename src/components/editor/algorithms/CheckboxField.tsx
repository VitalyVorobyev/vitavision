import { FieldLabel } from "./fieldChrome";

interface CheckboxFieldProps {
    label: string;
    checked?: boolean;
    onChange: (next: boolean) => void;
    disabled: boolean;
    tooltip?: string;
}

export function CheckboxField(props: CheckboxFieldProps) {
    const { label, checked, onChange, disabled, tooltip } = props;
    return (
        <label className="inline-flex cursor-pointer items-center gap-2">
            <input
                type="checkbox"
                checked={checked ?? false}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <FieldLabel label={label} tooltip={tooltip} />
        </label>
    );
}
