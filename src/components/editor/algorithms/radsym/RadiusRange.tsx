import type { RenderField } from "@vitavision/forms";
import { Field, InfoHint, NumberInput } from "@vitavision/ui";

import { radiusRange } from "./config";

const RADII_PATH = "config.radii";

/** `[3, 4, 5]` is the range 3..5; `[3, 5, 7]` and `[]` are not. */
function asRange(value: unknown): { min: number; max: number } | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    const radii = value as unknown[];
    const first = radii[0];
    if (typeof first !== "number") return null;
    const contiguous = radii.every((radius, index) => radius === first + index);
    return contiguous ? { min: first, max: first + radii.length - 1 } : null;
}

/**
 * Takes over the voting radii of the radsym config. The WASM document lists them
 * (`radii: [5, 6, …, 40]`), which a form can only offer as a JSON list; the editor's
 * question is "from how big to how big", so a contiguous list is edited as a minimum and a
 * maximum and written back as the full list. A list that is not a contiguous range (a deep
 * link can carry one) is left to the form's own JSON control, which shows it unchanged.
 */
export const renderRadsymField: RenderField = ({ path, value, onChange, disabled }) => {
    if (path !== RADII_PATH) return undefined;
    const range = asRange(value);
    if (range === null) return undefined;

    return (
        <div className="grid grid-cols-2 gap-x-3">
            <Field
                label="Min radius"
                annotation={<InfoHint label="About Min radius">Smallest voting radius in pixels.</InfoHint>}
            >
                <NumberInput
                    aria-label="Min radius"
                    unit="px"
                    disabled={disabled}
                    value={range.min}
                    min={1}
                    max={range.max}
                    step={1}
                    onValueChange={(next) => onChange(radiusRange(Math.round(next), range.max))}
                />
            </Field>
            <Field
                label="Max radius"
                annotation={<InfoHint label="About Max radius">Largest voting radius in pixels.</InfoHint>}
            >
                <NumberInput
                    aria-label="Max radius"
                    unit="px"
                    disabled={disabled}
                    value={range.max}
                    min={range.min}
                    max={500}
                    step={1}
                    onValueChange={(next) => onChange(radiusRange(range.min, Math.round(next)))}
                />
            </Field>
        </div>
    );
};
