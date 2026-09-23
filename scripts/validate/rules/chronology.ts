/**
 * Rule 9: feeds_into / lineage chronology.
 *
 * feeds_into is an intellectual-lineage edge A→B: A's primary-source year
 * must be ≤ B's year (A must predate or be contemporary with B).
 * extended_by and generalized_by are also lineage edges; violations there
 * are warnings rather than hard errors.
 * learned_alternative_of is intentionally excluded: the host is a model
 * that is newer than the classical algorithm target, so the host is
 * correctly newer than the target — checking it would produce false positives.
 */
import { parseSourceRef } from "../../lib/source-ref.ts";
import type { Diagnostic, TypedRelation, ValidationContext } from "../types.ts";

export function chronologyRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Build slug → year map from all filtered entries.
    const slugYear = new Map<string, number | undefined>();
    for (const e of [...ctx.algoFiltered, ...ctx.modelFiltered, ...ctx.conceptFiltered]) {
        const primaryRef = (e.frontmatter.sources as { primary?: string } | undefined)?.primary;
        if (!primaryRef) {
            slugYear.set(e.slug, undefined);
            continue;
        }
        const parsed = parseSourceRef(primaryRef);
        if (parsed.kind === "paper") {
            // Strip "paper:" prefix to get bare id.
            const bareId = parsed.key.startsWith("paper:") ? parsed.key.slice("paper:".length) : parsed.key;
            slugYear.set(e.slug, ctx.paperYears.get(bareId));
        } else {
            // repo or doc — no publication year available.
            slugYear.set(e.slug, undefined);
        }
    }

    for (const e of [...ctx.algoFiltered, ...ctx.modelFiltered, ...ctx.conceptFiltered]) {
        const relations = (e.frontmatter.relations as TypedRelation[] | undefined) ?? [];
        const hostYear = slugYear.get(e.slug);

        for (const rel of relations) {
            if (rel.type !== "feeds_into" && rel.type !== "extended_by" && rel.type !== "generalized_by") {
                continue;
            }

            const targetYear = slugYear.get(rel.target);

            // Skip when either year is unknown — concept pages, repo/doc-sourced
            // pages, or pages whose primary source has no year entry.
            if (hostYear === undefined || targetYear === undefined) continue;

            if (rel.type === "feeds_into" && targetYear < hostYear) {
                diagnostics.push({
                    level: "error",
                    message: `[${e.file}] feeds_into target "${rel.target}" (${targetYear}) predates host (${hostYear}) — feeds_into is an intellectual-lineage edge and must be chronological (see CLAUDE.md → Relations field)`,
                });
            } else if ((rel.type === "extended_by" || rel.type === "generalized_by") && targetYear < hostYear) {
                diagnostics.push({
                    level: "warning",
                    message: `[${e.file}] ${rel.type} target "${rel.target}" (${targetYear}) predates host (${hostYear}) — ${rel.type} is a lineage edge and the target is expected to be at least as recent as the host`,
                });
            }
        }
    }

    return diagnostics;
}
