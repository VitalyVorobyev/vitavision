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

const inputClass =
    "rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors " +
    "hover:border-muted-foreground/40 " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

export function Section(props: SectionProps) {
    const { title, children } = props;
    return (
        <section className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {title}
            </h3>
            {children}
        </section>
    );
}

export function NumberField(props: NumberFieldProps) {
    const { label, value, onChange, disabled, min, max, step, placeholder } = props;
    return (
        <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
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
                className={inputClass}
            />
        </label>
    );
}

export function CheckboxField(props: CheckboxFieldProps) {
    const { label, checked, onChange, disabled } = props;
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={checked ?? false}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-foreground">{label}</span>
        </label>
    );
}

export function SelectField<TValue extends string>(props: SelectFieldProps<TValue>) {
    const { label, value, onChange, disabled, options } = props;
    return (
        <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <select
                value={value ?? options[0]?.value ?? ""}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value as TValue)}
                className={inputClass}
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
