/**
 * Rule 5: non-draft model pages must have implementations[] (unless
 * noPublicImpl: true).
 * Rule 6: noPublicImpl: true requires a non-empty ## Limitations section.
 */
import type { Diagnostic, ValidationContext } from "../types.ts";

export function implementationsRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // ── Rule 5 ───────────────────────────────────────────────────────────────
    for (const e of ctx.modelFiltered) {
        if (e.isDraft) continue;
        if (e.frontmatter.noPublicImpl === true) continue;
        const impls = e.frontmatter.implementations as unknown[] | undefined;
        if (!impls || impls.length === 0) {
            diagnostics.push({
                level: "error",
                message: `[${e.file}] model page is not draft but has no implementations[] entry (and noPublicImpl is not set)`,
            });
        }
    }

    // ── Rule 6 ───────────────────────────────────────────────────────────────
    for (const e of ctx.modelFiltered) {
        if (e.frontmatter.noPublicImpl !== true) continue;
        const lines = e.content.split("\n");
        let inLimitations = false;
        let hasLimitationsHeading = false;
        let hasLimitationsBody = false;
        for (const line of lines) {
            if (line.startsWith("## Limitations")) {
                inLimitations = true;
                hasLimitationsHeading = true;
                continue;
            }
            if (inLimitations) {
                if (line.startsWith("## ")) {
                    break;
                }
                if (line.trim() !== "" && !line.startsWith("#")) {
                    hasLimitationsBody = true;
                    break;
                }
            }
        }
        if (!hasLimitationsHeading) {
            diagnostics.push({ level: "error", message: `[${e.file}] noPublicImpl: true requires a ## Limitations section` });
        } else if (!hasLimitationsBody) {
            diagnostics.push({ level: "error", message: `[${e.file}] noPublicImpl: true requires a non-empty ## Limitations section` });
        }
    }

    return diagnostics;
}
