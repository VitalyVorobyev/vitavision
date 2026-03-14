interface SectionProps {
    title: string;
    children: React.ReactNode;
}

interface NumberFieldProps {
    label: string;
    value?: number;
    onChange: (next: number | undefined) => void;
    disabled: boolean;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

interface CheckboxFieldProps {
    label: string;
    checked?: boolean;
    onChange: (next: boolean) => void;
    disabled: boolean;
}

interface SelectFieldProps<TValue extends string> {
    label: string;
    value?: TValue;
    onChange: (next: TValue) => void;
    disabled: boolean;
    options: Array<{ value: TValue; label: string }>;
}

export function Section(props: SectionProps) {
    const { title, children } = props;
    return (
        <section className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {title}
            </h3>
            {children}
        </section>
    );
}

export function NumberField(props: NumberFieldProps) {
    const { label, value, onChange, disabled, min, max, step, placeholder } = props;
    return (
        <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                value={value ?? ""}
                placeholder={placeholder}
                onChange={(event) => {
                    const raw = event.target.value.trim();
                    onChange(raw === "" ? undefined : Number(raw));
                }}
                className="rounded-md border border-border bg-background px-3 py-2"
            />
        </label>
    );
}

export function CheckboxField(props: CheckboxFieldProps) {
    const { label, checked, onChange, disabled } = props;
    return (
        <label className="inline-flex items-center gap-2 text-sm">
            <input
                type="checkbox"
                checked={checked ?? false}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span>{label}</span>
        </label>
    );
}

export function SelectField<TValue extends string>(props: SelectFieldProps<TValue>) {
    const { label, value, onChange, disabled, options } = props;
    return (
        <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <select
                value={value ?? options[0]?.value ?? ""}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value as TValue)}
                className="rounded-md border border-border bg-background px-3 py-2"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
