import { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ChevronRight, Info, Minus, Plus } from "lucide-react";

/* ── tooltip ─────────────────────────────────────────────────── */

function InfoTooltip({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
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
        let left = rect.left + rect.width / 2 - 112;
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
            <Info size={12} className="cursor-help text-muted-foreground/50 hover:text-muted-foreground" />
            {open && (
                <div
                    className="fixed z-[100] w-56 rounded-md border border-border bg-surface p-2 text-[11px] leading-relaxed text-foreground shadow-lg pointer-events-none"
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
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
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

export interface FieldOption<TValue extends string> {
    value: TValue;
    label: string;
    shortLabel?: string;
}

interface SelectFieldProps<TValue extends string> {
    label: string;
    value?: TValue;
    onChange: (next: TValue) => void;
    disabled: boolean;
    options: Array<FieldOption<TValue>>;
    tooltip?: string;
    presentation?: "auto" | "select" | "segmented";
}

export type FormControlMode = "desktop" | "touch";

const FormControlModeContext = createContext<FormControlMode>("desktop");

const compactInputClass =
    "rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors " +
    "hover:border-muted-foreground/40 " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

const touchInputClass =
    "rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors " +
    "hover:border-muted-foreground/40 " +
    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

function useFormControlMode(): FormControlMode {
    return useContext(FormControlModeContext);
}

function getSectionGridClass(columns: 1 | 2 | undefined, controlMode: FormControlMode): string {
    if (columns !== 2) {
        return "grid gap-y-2.5";
    }

    return controlMode === "touch"
        ? "grid grid-cols-1 gap-x-3 gap-y-2.5 min-[612px]:grid-cols-2"
        : "grid grid-cols-2 gap-x-3 gap-y-2.5";
}

export function FormControlModeProvider({
    mode,
    children,
}: {
    mode: FormControlMode;
    children: React.ReactNode;
}) {
    return (
        <FormControlModeContext.Provider value={mode}>
            {children}
        </FormControlModeContext.Provider>
    );
}

function getStepPrecision(step: number): number {
    if (!Number.isFinite(step) || step <= 0) {
        return 0;
    }

    const text = String(step);
    if (!text.includes(".")) {
        return 0;
    }

    return text.split(".")[1]?.length ?? 0;
}

function clampNumber(value: number, min?: number, max?: number): number {
    let next = value;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
}

function stepNumber(
    baseValue: number,
    deltaSteps: number,
    step: number,
    min?: number,
    max?: number,
): number {
    const precision = getStepPrecision(step);
    const next = clampNumber(baseValue + deltaSteps * step, min, max);
    return Number(next.toFixed(precision));
}

function shouldUseSegmentedControl<TValue extends string>(
    options: Array<FieldOption<TValue>>,
    presentation: SelectFieldProps<TValue>["presentation"],
): boolean {
    if (presentation === "segmented") {
        return true;
    }
    if (presentation === "select") {
        return false;
    }
    return options.length <= 4 && options.every((option) => (option.shortLabel ?? option.label).length <= 14);
}

export function Section(props: SectionProps) {
    const { title, children, columns } = props;
    const controlMode = useFormControlMode();
    return (
        <section className="space-y-2.5 rounded-xl border border-border/70 bg-background/60 p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {title}
            </h3>
            <div className={getSectionGridClass(columns, controlMode)}>
                {children}
            </div>
        </section>
    );
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    columns?: 1 | 2;
    defaultOpen?: boolean;
}

export function CollapsibleSection(props: CollapsibleSectionProps) {
    const { title, children, columns, defaultOpen = false } = props;
    const [open, setOpen] = useState(defaultOpen);
    const controlMode = useFormControlMode();

    return (
        <section className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center gap-1.5 p-3 text-left transition-colors hover:bg-muted/30"
            >
                <ChevronRight
                    size={12}
                    className={`text-muted-foreground/60 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
                />
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    {title}
                </h3>
            </button>
            {open && (
                <div className={`px-3 pb-3 ${getSectionGridClass(columns, controlMode)}`}>
                    {children}
                </div>
            )}
        </section>
    );
}

export function NumberField(props: NumberFieldProps) {
    const { label, value, onChange, disabled, min, max, step = 1, placeholder, tooltip } = props;
    const controlMode = useFormControlMode();
    const inputRef = useRef<HTMLInputElement>(null);
    const holdTimeoutRef = useRef<number | null>(null);
    const holdIntervalRef = useRef<number | null>(null);
    const scrubStateRef = useRef<{
        pointerId: number;
        startX: number;
        startValue: number;
        lastDeltaSteps: number;
    } | null>(null);
    const [scrubOffset, setScrubOffset] = useState(0);
    const [scrubbing, setScrubbing] = useState(false);

    const nudgeValue = useCallback((deltaSteps: number, baseValue?: number) => {
        const startValue = baseValue ?? value ?? min ?? 0;
        onChange(stepNumber(startValue, deltaSteps, step, min, max));
    }, [max, min, onChange, step, value]);

    const clearHoldTimers = useCallback(() => {
        if (holdTimeoutRef.current !== null) {
            window.clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
        if (holdIntervalRef.current !== null) {
            window.clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
    }, []);

    useEffect(() => clearHoldTimers, [clearHoldTimers]);

    const handleWheelEvent = useEffectEvent((event: WheelEvent) => {
        const el = inputRef.current;
        if (!el || document.activeElement !== el) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        if (disabled) {
            return;
        }

        nudgeValue(event.deltaY < 0 ? 1 : -1);
    });

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const handleWheel = (event: WheelEvent) => handleWheelEvent(event);
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, []);

    const startHold = (deltaSteps: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
        if (disabled) {
            return;
        }

        event.preventDefault();
        clearHoldTimers();
        nudgeValue(deltaSteps);
        holdTimeoutRef.current = window.setTimeout(() => {
            holdIntervalRef.current = window.setInterval(() => nudgeValue(deltaSteps), 120);
        }, 260);
    };

    const stopHold = () => {
        clearHoldTimers();
    };

    const handleScrubPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (disabled) {
            return;
        }

        event.preventDefault();
        scrubStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startValue: value ?? min ?? 0,
            lastDeltaSteps: 0,
        };
        setScrubbing(true);
        setScrubOffset(0);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleScrubPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        const scrubState = scrubStateRef.current;
        if (!scrubState || scrubState.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - scrubState.startX;
        const deltaSteps = Math.round(deltaX / 14);
        setScrubOffset(Math.max(-22, Math.min(22, deltaX / 4)));
        if (deltaSteps === scrubState.lastDeltaSteps) {
            return;
        }

        scrubState.lastDeltaSteps = deltaSteps;
        onChange(stepNumber(scrubState.startValue, deltaSteps, step, min, max));
    };

    const handleScrubPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
        const scrubState = scrubStateRef.current;
        if (!scrubState || scrubState.pointerId !== event.pointerId) {
            return;
        }

        scrubStateRef.current = null;
        setScrubbing(false);
        setScrubOffset(0);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const inputMode = step < 1 ? "decimal" : "numeric";

    if (controlMode === "desktop") {
        return (
            <label className="grid gap-1">
                <FieldLabel label={label} tooltip={tooltip} />
                <input
                    ref={inputRef}
                    type="number"
                    inputMode={inputMode}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    value={value ?? ""}
                    placeholder={placeholder}
                    onChange={(event) => {
                        const raw = event.target.value.trim();
                        if (raw === "") {
                            onChange(undefined);
                            return;
                        }

                        const parsed = Number(raw);
                        if (Number.isFinite(parsed)) {
                            onChange(parsed);
                        }
                    }}
                    className={`number-field-input ${compactInputClass}`}
                />
            </label>
        );
    }

    return (
        <div className="grid gap-1">
            <FieldLabel label={label} tooltip={tooltip} />
            <div className="overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-muted-foreground/40 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                <div className="flex items-stretch">
                    <button
                        type="button"
                        onPointerDown={startHold(-1)}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        onPointerCancel={stopHold}
                        disabled={disabled}
                        aria-label={`Decrease ${label}`}
                        className="flex w-10 shrink-0 items-center justify-center border-r border-border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Minus size={14} />
                    </button>
                    <input
                        ref={inputRef}
                        type="number"
                        inputMode={inputMode}
                        min={min}
                        max={max}
                        step={step}
                        disabled={disabled}
                        value={value ?? ""}
                        placeholder={placeholder}
                        onChange={(event) => {
                            const raw = event.target.value.trim();
                            if (raw === "") {
                                onChange(undefined);
                                return;
                            }

                            const parsed = Number(raw);
                            if (Number.isFinite(parsed)) {
                                onChange(parsed);
                            }
                        }}
                        className="number-field-input min-w-0 flex-1 bg-transparent px-3 py-2 text-center text-sm font-medium text-foreground outline-none"
                    />
                    <button
                        type="button"
                        onPointerDown={startHold(1)}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        onPointerCancel={stopHold}
                        disabled={disabled}
                        aria-label={`Increase ${label}`}
                        className="flex w-10 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div className="border-t border-border/70 px-2 py-1">
                    <button
                        type="button"
                        disabled={disabled}
                        onPointerDown={handleScrubPointerDown}
                        onPointerMove={handleScrubPointerMove}
                        onPointerUp={handleScrubPointerEnd}
                        onPointerCancel={handleScrubPointerEnd}
                        onPointerLeave={handleScrubPointerEnd}
                        className="relative block h-4 w-full touch-none disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Adjust ${label} by dragging horizontally`}
                        title="Drag horizontally to adjust"
                    >
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/80" />
                        <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/50" />
                        <span
                            className={`absolute top-1/2 h-1.5 w-7 -translate-y-1/2 rounded-full transition-colors ${
                                scrubbing ? "bg-primary/45" : "bg-muted-foreground/25"
                            }`}
                            style={{ left: `calc(50% - 0.875rem + ${scrubOffset}px)` }}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
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
