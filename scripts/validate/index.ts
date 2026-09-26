/**
 * Content validation orchestrator.
 *
 * Builds a `ValidationContext` (all disk I/O — see ./context.ts) then runs
 * every rule module in the exact same order the original monolithic
 * validate-content.ts did (note: Rule 9 runs before Rule 5 — this is
 * intentional, preserved for byte-identical diagnostic ordering).
 *
 * Diagnostics from context-building (index.yaml loader errors, frontmatter
 * parse errors) are emitted first, exactly as they were pushed before any
 * rule ran in the original file.
 */
import { buildValidationContext } from "./context.ts";
import type { ValidateContentOptions } from "./context.ts";
import type { Diagnostic } from "./types.ts";
import { slugsRule } from "./rules/slugs.ts";
import { cyclesRule } from "./rules/cycles.ts";
import { sourcesRule } from "./rules/sources.ts";
import { canonicalRule } from "./rules/canonical.ts";
import { historicalRule } from "./rules/historical.ts";
import { chronologyRule } from "./rules/chronology.ts";
import { implementationsRule } from "./rules/implementations.ts";
import { domainRule } from "./rules/domain.ts";
import { tagsRule } from "./rules/tags.ts";
import { proseRefsRule } from "./rules/prose-refs.ts";
import { narrativesRule } from "./rules/narratives/index.ts";
import { schemasRule } from "./rules/schemas.ts";
import { imagesRule } from "./rules/images.ts";
import { linksRule } from "./rules/links.ts";
import { crossRefsRule } from "./rules/cross-refs.ts";
import { authorsRule } from "./rules/authors.ts";

export type { ValidateContentOptions };

/**
 * Validate all content entries.
 * Always loads content from disk.
 * Returns list of error strings (empty = clean).
 */
export async function validateContent(options?: ValidateContentOptions): Promise<string[]> {
    const ctx = buildValidationContext(options ?? {});

    const all: Diagnostic[] = [...ctx.loaderDiagnostics];
    all.push(...slugsRule(ctx));                 // Rule 1: slug resolution
    all.push(...cyclesRule(ctx));                 // Rule 2: prerequisite cycles
    all.push(...sourcesRule(ctx));                // Rule 3: source-id existence
    all.push(...(await canonicalRule(ctx)));      // Rule 4: canonical quality gates
    all.push(...historicalRule(ctx));             // Rule 4b: typed relations + historical quality gates
    all.push(...chronologyRule(ctx));             // Rule 9: feeds_into / lineage chronology
    all.push(...implementationsRule(ctx));        // Rule 5 + 6: model implementations / noPublicImpl
    all.push(...domainRule(ctx));                 // Rule 7: domain required
    all.push(...tagsRule(ctx));                   // Rule 8: tags.yaml drift
    all.push(...proseRefsRule(ctx));              // Rule 10: prose references (warning only)
    all.push(...(await narrativesRule(ctx)));     // Rule 11: narratives
    all.push(...schemasRule(ctx));                // Rule 12: blog/demo frontmatter schemas
    all.push(...imagesRule(ctx));                 // Rule 13: image references (all kinds)
    all.push(...linksRule(ctx));                  // Rule 14: internal links (all kinds)
    all.push(...crossRefsRule(ctx));              // Rule 15: relatedPosts/relatedDemos/relatedAlgorithms
    all.push(...authorsRule(ctx));                // Rule 16: author registry integrity

    const errors = all.filter((d) => d.level === "error").map((d) => d.message);
    const warnings = all.filter((d) => d.level === "warning").map((d) => d.message);

    const totalChecked =
        ctx.algoFiltered.length + ctx.modelFiltered.length + ctx.conceptFiltered.length + ctx.narrativeFiltered.length;

    // ── Summary ───────────────────────────────────────────────────────────────
    if (errors.length === 0) {
        console.log(
            `content:validate — ${totalChecked} page(s) validated (${ctx.algoFiltered.length} algo, ${ctx.modelFiltered.length} model, ${ctx.conceptFiltered.length} concept, ${ctx.narrativeFiltered.length} narrative, ${ctx.blogEntries.length} blog, ${ctx.demoEntries.length} demo), no errors`,
        );
    }
    if (warnings.length > 0) {
        for (const w of warnings) {
            console.warn(`  WARN  ${w}`);
        }
        console.warn(`content:validate — ${warnings.length} warning(s)`);
    }

    return errors;
}
