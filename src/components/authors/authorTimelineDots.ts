import type { TimelineEntry } from "../../lib/atlas/authorView.ts";

/** Shared dot styling/formatting between the desktop strip and the mobile
 *  vertical list, so the three legend states render identically in both. */
export interface DotStyle {
    fill: string;
    stroke: string;
    dashed: boolean;
}

export function dotStyle(state: TimelineEntry["state"]): DotStyle {
    if (state === "primary") return { fill: "hsl(var(--foreground))", stroke: "hsl(var(--foreground))", dashed: false };
    if (state === "cited") return { fill: "hsl(var(--surface))", stroke: "hsl(var(--foreground))", dashed: false };
    return { fill: "hsl(var(--surface))", stroke: "hsl(var(--muted-foreground))", dashed: true };
}

export function tickLabel(year: number): string {
    return `’${String(year).slice(-2)}`;
}
