/**
 * Rule 1: slug resolution.
 *
 * `prerequisites`, `failureModes`, and `relations[].target` all share a
 * single global slug namespace covering algorithms, models, and concepts.
 * Every referenced slug must resolve against the full (draft-inclusive)
 * namespace — see CLAUDE.md → "Single global slug namespace".
 */
import type { Diagnostic, ValidationContext } from "../types.ts";

export function slugsRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    function checkRelationshipField(
        file: string,
        fieldName: string,
        slugs: string[] | undefined,
    ): void {
        if (!slugs || slugs.length === 0) return;
        for (const slug of slugs) {
            if (!ctx.knownSlugs.has(slug)) {
                diagnostics.push({ level: "error", message: `[${file}] unknown slug "${slug}" in ${fieldName}` });
            }
        }
    }

    for (const e of [...ctx.algoFiltered, ...ctx.modelFiltered, ...ctx.conceptFiltered]) {
        checkRelationshipField(e.file, "prerequisites", e.frontmatter.prerequisites as string[] | undefined);
        checkRelationshipField(e.file, "failureModes", e.frontmatter.failureModes as string[] | undefined);
        const relations = (e.frontmatter.relations as Array<{ target?: string }> | undefined) ?? [];
        for (const rel of relations) {
            if (rel?.target && !ctx.knownSlugs.has(rel.target)) {
                diagnostics.push({ level: "error", message: `[${e.file}] unknown slug "${rel.target}" in relations[].target` });
            }
        }
    }

    return diagnostics;
}
