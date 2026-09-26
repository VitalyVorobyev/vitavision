/**
 * Rule: blog + demo frontmatter zod issues.
 *
 * Ported from the old scripts/content-validate.ts's `validateFrontmatter()`.
 * Runs over `ctx.blogEntries`/`ctx.demoEntries` — kept raw (unparsed) by
 * context.ts specifically so this rule can independently zod-validate them
 * and report every issue, regardless of draft status (matching the old
 * validator, which never filtered by draft).
 */
import type { ZodError } from "zod";
import { blogFrontmatterSchema, demoFrontmatterSchema } from "../../../src/lib/content/schema.ts";
import type { Diagnostic, ValidationContext } from "../types.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function checkFrontmatter(
    diagnostics: Diagnostic[],
    entries: MarkdownDirEntry[],
    schema: { parse: (data: unknown) => unknown },
    label: string,
): void {
    for (const { file, data } of entries) {
        try {
            schema.parse(data);
        } catch (e) {
            const zodErr = e as ZodError;
            for (const issue of zodErr.issues) {
                diagnostics.push({
                    level: "error",
                    message: `[${file}] ${label} frontmatter: ${issue.path.join(".")} — ${issue.message}`,
                });
            }
        }
    }
}

export function schemasRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    checkFrontmatter(diagnostics, ctx.blogEntries, blogFrontmatterSchema, "blog");
    checkFrontmatter(diagnostics, ctx.demoEntries, demoFrontmatterSchema, "demo");
    return diagnostics;
}
