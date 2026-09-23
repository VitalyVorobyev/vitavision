/**
 * Rule 11 (edges part): edges reference declared nodes, no self-edges,
 * evolution chronology, and a warning-only cross-check against the
 * endpoints' authored Atlas relations[].
 */
import { violatesEvolutionChronology } from "../../../narrative-build.ts";
import type { Diagnostic, ValidationContext } from "../../types.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";

export function checkEdges(
    file: string,
    fm: NarrativeFrontmatterShape,
    nodeIds: Set<string>,
    nodeYear: Map<string, number | undefined>,
    nodeSlug: Map<string, string>,
    ctx: ValidationContext,
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const edges = fm.edges ?? [];

    for (const edge of edges) {
        if (edge.from === edge.to) {
            diagnostics.push({ level: "error", message: `[${file}] self-edge on node "${edge.from}"` });
        }
        const fromKnown = nodeIds.has(edge.from);
        const toKnown = nodeIds.has(edge.to);
        if (!fromKnown) {
            diagnostics.push({ level: "error", message: `[${file}] edge references unknown node "${edge.from}" (from)` });
        }
        if (!toKnown) {
            diagnostics.push({ level: "error", message: `[${file}] edge references unknown node "${edge.to}" (to)` });
        }
        if (edge.type === "evolution" && fromKnown && toKnown) {
            const fromYear = nodeYear.get(edge.from);
            const toYear = nodeYear.get(edge.to);
            if (violatesEvolutionChronology(fromYear, toYear)) {
                diagnostics.push({
                    level: "error",
                    message: `[${file}] evolution edge ${edge.from} → ${edge.to} violates chronology (${fromYear} > ${toYear})`,
                });
            }
        }

        // Warning-only: does this edge's simplified story-altitude type
        // contradict the Atlas relations[] between the two pages? Only
        // checked when both endpoints are `page` nodes (nodeSlug is
        // populated for those only) — narratives may legitimately
        // simplify, so this never errors.
        if (fromKnown && toKnown) {
            const fromSlug = nodeSlug.get(edge.from);
            const toSlug = nodeSlug.get(edge.to);
            if (fromSlug && toSlug) {
                const fromRelations = ctx.atlasBySlug.get(fromSlug)?.relations ?? [];
                const toRelations = ctx.atlasBySlug.get(toSlug)?.relations ?? [];
                const isLineageType = (t: string) => t === "generalized_by" || t === "extended_by";

                if (edge.type === "contrast") {
                    const forward = fromRelations.find((r) => r.target === toSlug && isLineageType(r.type));
                    const backward = toRelations.find((r) => r.target === fromSlug && isLineageType(r.type));
                    const lineage = forward ?? backward;
                    if (lineage) {
                        const [lFrom, lTo] = forward ? [fromSlug, toSlug] : [toSlug, fromSlug];
                        diagnostics.push({
                            level: "warning",
                            message: `[${file}] contrast edge ${edge.from} → ${edge.to} over a lineage relation (Atlas: "${lFrom}" ${lineage.type} "${lTo}")`,
                        });
                    }
                }

                if (edge.type === "evolution") {
                    const reverse = toRelations.find(
                        (r) => r.target === fromSlug && (isLineageType(r.type) || r.type === "feeds_into"),
                    );
                    if (reverse) {
                        diagnostics.push({
                            level: "warning",
                            message: `[${file}] evolution edge ${edge.from} → ${edge.to} runs against Atlas lineage direction (Atlas: "${toSlug}" ${reverse.type} "${fromSlug}")`,
                        });
                    }
                }
            }
        }
    }

    return diagnostics;
}
