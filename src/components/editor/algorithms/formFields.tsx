import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

/* ── tooltip ─────────────────────────────────────────────────── */

function InfoTooltip({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <span
            ref={ref}
            className="relative inline-flex"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onClick={() => setOpen((v) => !v)}
        >
            <Info size={12} className="text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
            {open && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-md border border-border bg-popover p-2 text-[11px] text-popover-foreground shadow-md leading-relaxed">
                    {text}
                </div>
            )}
        </span>
    );
}

/* ── field label ─────────────────────────────────────────────── */

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
    return (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
        </span>
    );
}

/* ── types ───────────────────────────────────────────────────── */

interface SectionProps {
    title: string;
    children: React.ReactNode;
    columns?: 1 | 2;
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
    tooltip?: string;
}

interface CheckboxFieldProps {
    label: string;
    checked?: boolean;
    onChange: (next: boolean) => void;
    disabled: boolean;
    tooltip?: string;
}

interface SelectFieldProps<TValue extends string> {
    label: string;
    value?: TValue;
    onChange: (next: TValue) => void;
    disabled: boolean;
    options: Array<{ value: TValue; label: string }>;
    tooltip?: string;
}

const inputClass =
    "rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors " +
    "hover:border-muted-foreground/40 " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

export function Section(props: SectionProps) {
    const { title, children, columns } = props;
    return (
        <section className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {title}
            </h3>
            <div className={columns === 2 ? "grid grid-cols-2 gap-x-3 gap-y-2.5" : "grid gap-y-2.5"}>
                {children}
            </div>
        </section>
    );
}

export function NumberField(props: NumberFieldProps) {
    const { label, value, onChange, disabled, min, max, step, placeholder, tooltip } = props;
    return (
        <label className="grid gap-1">
            <FieldLabel label={label} tooltip={tooltip} />
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
    const { label, checked, onChange, disabled, tooltip } = props;
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={checked ?? false}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <FieldLabel label={label} tooltip={tooltip} />
        </label>
    );
}

export function SelectField<TValue extends string>(props: SelectFieldProps<TValue>) {
    const { label, value, onChange, disabled, options, tooltip } = props;
    return (
        <label className="grid gap-1">
            <FieldLabel label={label} tooltip={tooltip} />
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
