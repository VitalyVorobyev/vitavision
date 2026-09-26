/**
 * Rule 4: canonical quality gates.
 *
 * `quality: "canonical"` marks a flagship reviewed page and gates it on:
 * not draft, non-empty title/summary, sources.primary (algorithm/model
 * only), at least one connecting edge, and no TODO in rendered HTML.
 * See CLAUDE.md → "Quality field".
 */
import { renderMarkdownPlain } from "../render.ts";
import type { Diagnostic, ValidationContext } from "../types.ts";

export async function canonicalRule(ctx: ValidationContext): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    for (const e of [...ctx.algoFiltered, ...ctx.modelFiltered, ...ctx.conceptFiltered]) {
        if (e.frontmatter.quality !== "canonical") continue;

        // Must not be draft
        if (e.isDraft) {
            diagnostics.push({ level: "error", message: `[${e.file}] quality: "canonical" but page is draft` });
        }

        // Must have non-empty title + summary
        const title = e.frontmatter.title as string | undefined;
        const summary = e.frontmatter.summary as string | undefined;
        if (!title || title.trim().length === 0) {
            diagnostics.push({ level: "error", message: `[${e.file}] quality: "canonical" but title is empty` });
        }
        if (!summary || summary.trim().length === 0) {
            diagnostics.push({ level: "error", message: `[${e.file}] quality: "canonical" but summary is empty` });
        }

        // Algorithm/model must have sources.primary
        const isAlgoOrModel = ctx.algoFiltered.some((a) => a.slug === e.slug) ||
            ctx.modelFiltered.some((m) => m.slug === e.slug);
        if (isAlgoOrModel) {
            const src = e.frontmatter.sources as { primary?: string } | undefined;
            if (!src?.primary) {
                diagnostics.push({ level: "error", message: `[${e.file}] quality: "canonical" algorithm/model must have sources.primary` });
            }
        }

        // Must be connected: at least one of prerequisites / relations[], or —
        // for concepts only — derived incoming connectivity (a root concept like
        // attention-mechanism authors no outgoing edges by design; its dependents
        // list it in their own prerequisites and the build derives usedBy).
        const prereqs = e.frontmatter.prerequisites as string[] | undefined;
        const relations = e.frontmatter.relations as Array<unknown> | undefined;
        const isConcept = ctx.conceptFiltered.some((c) => c.slug === e.slug);
        const hasDerivedIncoming = isConcept &&
            ctx.allGraphEntries.some((g) => g.prerequisites?.includes(e.slug));
        const hasRelationship =
            (prereqs && prereqs.length > 0) ||
            (relations && relations.length > 0) ||
            hasDerivedIncoming;
        if (!hasRelationship) {
            diagnostics.push({
                level: "error",
                message: `[${e.file}] quality: "canonical" requires prerequisites, relations[], or (for concepts) at least one page listing it as a prerequisite`,
            });
        }

        // Rendered HTML must not contain TODO (case-insensitive)
        const html = await renderMarkdownPlain(e.content);
        if (/TODO/i.test(html)) {
            diagnostics.push({ level: "error", message: `[${e.file}] quality: "canonical" but rendered HTML contains TODO` });
        }
    }

    return diagnostics;
}
