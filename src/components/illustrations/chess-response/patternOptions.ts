import type { ChessResponsePattern } from "./types";

/** The three test patterns, in the order the figure offers them. */
export const PATTERNS: readonly ChessResponsePattern[] = ["corner", "edge", "stripe"];

/** The patterns as `SegmentedControl` options. */
export const PATTERN_OPTIONS = PATTERNS.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
}));

/** `SegmentedControl` reports a string; map it back to the pattern it names. */
export function toPattern(value: string): ChessResponsePattern | undefined {
    return PATTERNS.find((pattern) => pattern === value);
}
