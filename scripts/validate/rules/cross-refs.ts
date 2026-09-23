/**
 * Rule: cross-content relationship fields — `relatedPosts` (→ blog slugs),
 * `relatedDemos` (→ demo slugs), and the legacy `relatedAlgorithms` (→ the
 * global atlas namespace: algorithm/model/concept slugs, draft-inclusive,
 * same as `ctx.knownSlugs`).
 *
 * Ported from the old scripts/content-validate.ts's `checkCrossReferences`,
 * generalized to every kind whose zod schema (src/lib/content/schema.ts)
 * declares these fields: blog (relatedAlgorithms, relatedDemos), demo
 * (relatedAlgorithms, relatedPosts), algorithm/model (relatedPosts,
 * relatedDemos). Concepts and narratives declare none of these fields.
 */
import type { BodyEntry, Diagnostic, ValidationContext } from "../types.ts";

function stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function checkField(
    diagnostics: Diagnostic[],
    e: BodyEntry,
    field: string,
    knownSlugs: Set<string>,
    label: string,
): void {
    for (const slug of stringArray(e.data[field])) {
        if (!knownSlugs.has(slug)) {
            diagnostics.push({
                level: "error",
                message: `[${e.file}] broken ${field} reference: ${slug} (${label} slug not found)`,
            });
        }
    }
}

export function crossRefsRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const e of ctx.bodyEntries) {
        switch (e.kind) {
            case "blog":
                checkField(diagnostics, e, "relatedAlgorithms", ctx.knownSlugs, "atlas");
                checkField(diagnostics, e, "relatedDemos", ctx.demoSlugs, "demo");
                break;
            case "demo":
                checkField(diagnostics, e, "relatedAlgorithms", ctx.knownSlugs, "atlas");
                checkField(diagnostics, e, "relatedPosts", ctx.blogSlugs, "blog");
                break;
            case "algorithm":
            case "model":
                checkField(diagnostics, e, "relatedPosts", ctx.blogSlugs, "blog");
                checkField(diagnostics, e, "relatedDemos", ctx.demoSlugs, "demo");
                break;
            default:
                // concept, narrative: no relatedPosts/relatedDemos/relatedAlgorithms field.
                break;
        }
    }

    return diagnostics;
}
