/**
 * Rule 7: non-draft pages must set `domain`.
 */
import type { Diagnostic, ValidationContext } from "../types.ts";

export function domainRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const e of [...ctx.algoFiltered, ...ctx.modelFiltered, ...ctx.conceptFiltered]) {
        if (e.isDraft) continue;
        if (!e.frontmatter.domain) {
            diagnostics.push({ level: "error", message: `[${e.file}] non-draft page must set domain` });
        }
    }

    return diagnostics;
}
