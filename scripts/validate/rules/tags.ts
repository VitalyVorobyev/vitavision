/**
 * Rule 8: content/tags.yaml ↔ tagValues drift check.
 *
 * Ensures the closed-vocabulary YAML and the schema constant stay in sync.
 * The unit test in schema.test.ts also checks this; the validator is the
 * build gate. `ctx.tagsYamlSlugs` is `null` when content/tags.yaml is absent
 * or has no `tags` key — both cases skip this rule entirely, same as the
 * original inline `if (existsSync(...))` / `if (parsed?.tags)` guards.
 */
import { tagValues } from "../../../src/lib/content/schema.ts";
import type { Diagnostic, ValidationContext } from "../types.ts";

export function tagsRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (ctx.tagsYamlSlugs === null) return diagnostics;

    const yamlSlugs = ctx.tagsYamlSlugs;
    const codeSlugs = new Set<string>(tagValues);

    for (const slug of yamlSlugs) {
        if (!codeSlugs.has(slug)) {
            diagnostics.push({
                level: "error",
                message: `[content/tags.yaml] slug "${slug}" is in tags.yaml but missing from tagValues in schema.ts`,
            });
        }
    }
    for (const slug of codeSlugs) {
        if (!yamlSlugs.has(slug)) {
            diagnostics.push({
                level: "error",
                message: `[schema.ts] tag "${slug}" is in tagValues but missing from content/tags.yaml`,
            });
        }
    }

    return diagnostics;
}
