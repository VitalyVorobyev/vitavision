import type { FieldOption, SelectFieldProps } from "./SelectField";

/* ── pure number helpers ─────────────────────────────────────── */

export function getStepPrecision(step: number): number {
    if (!Number.isFinite(step) || step <= 0) {
        return 0;
    }

    const text = String(step);
    if (!text.includes(".")) {
        return 0;
    }

    return text.split(".")[1]?.length ?? 0;
}

export function clampNumber(value: number, min?: number, max?: number): number {
    let next = value;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
}

export function stepNumber(
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

export function shouldUseSegmentedControl<TValue extends string>(
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
