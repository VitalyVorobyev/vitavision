import type { ChangeEvent } from "react";

/*
 * The seams between the site's typed configs and @vitavision/ui's form controls.
 *
 * ui's controls speak the DOM's language: `NumberInput` is an `<input type="number">` whose
 * value is text, and `Select` / `SegmentedControl` take `string` values. The algorithm and
 * target configs are typed (numbers that may be unset, string-literal unions). The
 * conversions live here, once, rather than at each of the hundred-odd fields.
 */

/**
 * What the text of a number field means: `undefined` for an empty field (the caller picks
 * the default), a finite number, or `null` for text that is not a number yet (`"-"`, `"1e"`),
 * which the caller should ignore rather than store.
 */
export function parseNumberText(raw: string): number | undefined | null {
    const text = raw.trim();
    if (text === "") return undefined;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The `value` and `onChange` of a ui `NumberInput` bound to an optional number: an empty
 * field reports `undefined`, text that is not (yet) a number is ignored.
 *
 *     <NumberInput {...numberInputProps(config.radius, (v) => set("radius", v ?? 2))} />
 */
export function numberInputProps(
    value: number | undefined,
    onValueChange: (next: number | undefined) => void,
): { value: number | ""; onChange: (event: ChangeEvent<HTMLInputElement>) => void } {
    return {
        value: value ?? "",
        onChange: (event) => {
            const next = parseNumberText(event.target.value);
            if (next !== null) onValueChange(next);
        },
    };
}

/** One choice of a `Select` or `SegmentedControl`, typed by the field's own union. */
export interface ChoiceOption<TValue extends string> {
    value: TValue;
    label: string;
}

/**
 * The `value`, `options` and `onValueChange` of a ui `Select` or `SegmentedControl` for a
 * field typed as a string union. The control reports plain strings; only a string that is
 * one of `options` is passed on, so the callback receives the union, not `string`.
 * An unset value shows the first option, as the site's selects always have.
 */
export function choiceProps<TValue extends string>(
    value: TValue | undefined,
    options: readonly ChoiceOption<TValue>[],
    onValueChange: (next: TValue) => void,
): {
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (next: string) => void;
} {
    return {
        value: value ?? options[0]?.value ?? "",
        options: options.map(({ value: v, label }) => ({ value: v, label })),
        onValueChange: (next) => {
            const match = options.find((option) => option.value === next);
            if (match) onValueChange(match.value);
        },
    };
}

/**
 * The grid a config group lays its fields out in: one column in the side rail, two in the
 * roomier configuration dialog.
 */
export function fieldGridClass(columns?: 1 | 2): string {
    return columns === 2 ? "grid grid-cols-2 gap-x-3 gap-y-2" : "grid gap-y-2";
}
