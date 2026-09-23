/**
 * Rule 4b: `quality: "historical"` gates (algorithm pages).
 *
 * A historical page is preserved for citation/lineage; the method is
 * superseded for practical use. The "Superseded by" link is derived from a
 * `relations[]` entry of type "generalized_by" with confidence "high".
 * See CLAUDE.md → "Quality field" and "Relations field" for the policy.

 */
import type { Diagnostic, TypedRelation, ValidationContext } from "../types.ts";

export function historicalRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const e of ctx.algoFiltered) {
        const relations = (e.frontmatter.relations as TypedRelation[] | undefined) ?? [];

        if (e.frontmatter.quality !== "historical") continue;

        // Page itself must not be draft.
        if (e.isDraft) {
            diagnostics.push({ level: "error", message: `[${e.file}] quality: "historical" but page is draft` });
        }

        // sources.primary is required — provenance is the whole point of preservation.
        const src = e.frontmatter.sources as { primary?: string } | undefined;
        if (!src?.primary) {
            diagnostics.push({ level: "error", message: `[${e.file}] quality: "historical" requires sources.primary` });
        }

        // At least one relations entry must be a high-confidence generalized_by.
        const supersededBy = relations.find(
            (r) => r.type === "generalized_by" && r.confidence === "high",
        );
        if (!supersededBy) {
            diagnostics.push({
                level: "error",
                message: `[${e.file}] quality: "historical" requires at least one relations[] entry with type: "generalized_by" and confidence: "high"`,
            });
            continue;
        }

        // The generalized_by/high target must resolve, must not be draft, and
        // must not itself be historical (no chains).
        if (!ctx.knownSlugs.has(supersededBy.target)) {
            // Already reported above; skip the deeper check.
            continue;
        }
        const targetEntry = ctx.allEntries.find((entry) => entry.slug === supersededBy.target);
        if (targetEntry) {
            if (targetEntry.isDraft) {
                diagnostics.push({
                    level: "error",
                    message: `[${e.file}] generalized_by/high target "${supersededBy.target}" is a draft page; resolve to a published successor`,
                });
            }
            if (targetEntry.frontmatter.quality === "historical") {
                diagnostics.push({
                    level: "error",
                    message: `[${e.file}] generalized_by/high target "${supersededBy.target}" is itself quality: "historical"; chains are not permitted`,
                });
            }
        }

        // Soft warning (not an error): historical pages should not contain
        // # Algorithm or # Implementation top-level headings — those belong on a
        // canonical page. Catches authoring drift without coupling the validator
        // to per-section markdown layout.
        const lines = e.content.split("\n");
        for (const line of lines) {
            if (/^#\s+(Algorithm|Implementation)\s*$/.test(line)) {
                diagnostics.push({
                    level: "warning",
                    message: `[${e.file}] quality: "historical" page contains "${line.trim()}" heading; trim per template`,
                });
                break;
            }
        }
    }

    return diagnostics;
}
