import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Info } from "lucide-react";

/* ── tooltip ─────────────────────────────────────────────────── */

function InfoTooltip({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLSpanElement>(null);

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

    const show = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pad = 8;
        let left = rect.left + rect.width / 2 - 112; // 112 = w-56 / 2
        left = Math.max(pad, Math.min(left, window.innerWidth - 224 - pad));
        let top = rect.top - pad;
        if (top < 40) top = rect.bottom + pad;
        setPos({ left, top, transform: top < rect.top ? "translateY(-100%)" : undefined });
        setOpen(true);
    }, []);

    return (
        <span
            ref={ref}
            className="relative inline-flex"
            onMouseEnter={show}
            onMouseLeave={() => setOpen(false)}
            onClick={show}
        >
            <Info size={12} className="text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
            {open && (
                <div
                    className="fixed z-[100] w-56 rounded-md border border-border bg-surface p-2 text-[11px] text-foreground shadow-lg leading-relaxed pointer-events-none"
                    style={pos}
                >
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
    const inputRef = useRef<HTMLInputElement>(null);
    const handleWheelEvent = useEffectEvent((e: WheelEvent) => {
        const el = inputRef.current;
        if (!el || document.activeElement !== el) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (disabled) {
            return;
        }

        const stepVal = step ?? 1;
        const delta = e.deltaY < 0 ? stepVal : -stepVal;
        // Round to step precision to avoid floating-point drift (e.g. 0.75 + 0.01 = 0.7600000000000001)
        const precision = Math.max(0, -Math.floor(Math.log10(stepVal)));
        let next = parseFloat(((value ?? 0) + delta).toFixed(precision));
        if (min != null) next = Math.max(min, next);
        if (max != null) next = Math.min(max, next);
        onChange(next);
    });

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => handleWheelEvent(e);
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, []);

    return (
        <label className="grid gap-1">
            <FieldLabel label={label} tooltip={tooltip} />
            <input
                ref={inputRef}
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
