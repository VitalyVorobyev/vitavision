/**
 * Rule 2: prerequisite cycle detection.
 */
import { detectPrerequisiteCycles } from "../../content-graph.ts";
import type { Diagnostic, ValidationContext } from "../types.ts";

export function cyclesRule(ctx: ValidationContext): Diagnostic[] {
    const cycles = detectPrerequisiteCycles(ctx.graph);
    return cycles.map((cycle) => ({
        level: "error" as const,
        message: `[prerequisite cycle] ${cycle.join(" → ")}`,
    }));
}
