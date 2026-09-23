/**
 * Rule 11 (lenses part): coords keys reference declared nodes; `overview`
 * exists and covers all nodes; warning-only x-order-vs-year inversions.
 */
import { findLensOrderInversions } from "../../../narrative-build.ts";
import type { Diagnostic } from "../../types.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";

export function checkLenses(
    file: string,
    fm: NarrativeFrontmatterShape,
    nodeIds: Set<string>,
    nodeYear: Map<string, number | undefined>,
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lenses = fm.lenses ?? [];

    const overviewLens = lenses.find((l) => l.id === "overview");
    if (!overviewLens) {
        diagnostics.push({ level: "error", message: `[${file}] narrative requires a lens with id "overview" covering all nodes` });
    } else {
        for (const nodeId of nodeIds) {
            if (!(nodeId in overviewLens.coords)) {
                diagnostics.push({ level: "error", message: `[${file}] overview lens is missing coords for node "${nodeId}"` });
            }
        }
    }
    for (const lens of lenses) {
        for (const key of Object.keys(lens.coords)) {
            if (!nodeIds.has(key)) {
                diagnostics.push({ level: "error", message: `[${file}] lens "${lens.id}" coords reference unknown node "${key}"` });
            }
        }
        // Warning: x-order inversions of >= 2 years between node pairs
        // (same/adjacent years may reorder freely).
        const lensNodes = Object.entries(lens.coords)
            .filter(([id]) => nodeIds.has(id))
            .map(([id, xy]) => ({ id, x: xy[0], year: nodeYear.get(id) }));
        for (const [a, b] of findLensOrderInversions(lensNodes)) {
            diagnostics.push({
                level: "warning",
                message: `[${file}] lens "${lens.id}" x-order inversion between "${a}" and "${b}" (>= 2 years apart)`,
            });
        }
    }

    return diagnostics;
}
