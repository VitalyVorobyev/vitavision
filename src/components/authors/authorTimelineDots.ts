import type { TimelineEntry } from "../../lib/atlas/authorView.ts";

/** Shared dot styling/formatting between the desktop strip and the mobile
 *  vertical list, so the three legend states render identically in both. */
export interface DotStyle {
    fill: string;
    stroke: string;
    dashed: boolean;
}

export function dotStyle(state: TimelineEntry["state"]): DotStyle {
    if (state === "primary") return { fill: "var(--fg)", stroke: "var(--fg)", dashed: false };
    if (state === "cited") return { fill: "var(--surface)", stroke: "var(--fg)", dashed: false };
    return { fill: "var(--surface)", stroke: "var(--fg-muted)", dashed: true };
}

export function tickLabel(year: number): string {
    return `’${String(year).slice(-2)}`;
}
