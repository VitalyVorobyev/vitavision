/**
 * Content validation script.
 *
 * Validates slug resolution, source-id existence, canonical quality gates,
 * prerequisite cycle detection, and model implementations requirements.
 *
 * Run standalone: bun run scripts/validate-content.ts
 * Also imported by content-build.ts for build-time validation.
 *
 * Exit code 1 on any validation failure.
 * Set INCLUDE_DRAFTS=true to also validate draft pages.
 *
 * The implementation lives in ./validate/** (a context builder + one rule
 * module per validation rule, with vitest fixtures per rule) — this file is
 * just the re-export + CLI entry point.
 */
import { validateContent } from "./validate/index.ts";
export { validateContent };
export type { ValidateContentOptions } from "./validate/index.ts";

// ── Standalone entry point ────────────────────────────────────────────────────
if (import.meta.main) {
    const includeDrafts = process.env.INCLUDE_DRAFTS === "true";
    console.log(`content:validate — checking content (includeDrafts=${includeDrafts})...\n`);

    validateContent().then((errors) => {
        if (errors.length > 0) {
            for (const err of errors) {
                console.error(`  ERROR ${err}`);
            }
            console.error(`\ncontent:validate — ${errors.length} error(s) found`);
            process.exit(1);
        }
    }).catch((err) => {
        console.error("content:validate failed:", err);
        process.exit(1);
    });
}
