import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { FieldLabel } from "./fieldChrome";
import { compactInputClass, useFormControlMode } from "./controlMode";
import { stepNumber } from "./numberUtils";

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

    const startHold = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        if (disabled) {
            return;
        }

        const deltaSteps = Number(event.currentTarget.dataset.delta ?? 0);
        event.preventDefault();
        clearHoldTimers();
        nudgeValue(deltaSteps);
        holdTimeoutRef.current = window.setTimeout(() => {
            holdIntervalRef.current = window.setInterval(() => nudgeValue(deltaSteps), 120);
        }, 260);
    }, [clearHoldTimers, disabled, nudgeValue]);

    const stopHold = useCallback(() => {
        clearHoldTimers();
    }, [clearHoldTimers]);

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
                        data-delta={-1}
                        onPointerDown={startHold}
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
                        data-delta={1}
                        onPointerDown={startHold}
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
