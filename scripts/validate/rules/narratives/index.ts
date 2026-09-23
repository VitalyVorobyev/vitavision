/**
 * Rule 11: narratives.
 *
 * Iterates narratives in the outer loop (matching the original monolith's
 * execution order exactly) and, per narrative, runs nodes → edges → lenses
 * → steps in that order — order preservation beats the split here.
 */
import type { Diagnostic, ValidationContext } from "../../types.ts";
import { checkNodes } from "./nodes.ts";
import { checkEdges } from "./edges.ts";
import { checkLenses } from "./lenses.ts";
import { checkSteps } from "./steps.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";

export async function narrativesRule(ctx: ValidationContext): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    for (const e of ctx.narrativeFiltered) {
        const fm = e.frontmatter as NarrativeFrontmatterShape;

        const { diagnostics: nodeDiagnostics, nodeIds, nodeYear, nodeSlug } = checkNodes(e.file, fm, ctx);
        diagnostics.push(...nodeDiagnostics);

        diagnostics.push(...checkEdges(e.file, fm, nodeIds, nodeYear, nodeSlug, ctx));

        diagnostics.push(...checkLenses(e.file, fm, nodeIds, nodeYear));

        diagnostics.push(...(await checkSteps(e.file, e.content, fm, nodeIds)));
    }

    return diagnostics;
}
