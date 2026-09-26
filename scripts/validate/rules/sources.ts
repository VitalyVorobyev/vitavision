/**
 * Rule 3: source-id existence.
 *
 * `sources.primary` / `sources.references[]` accept `paper:<id>` (or a bare
 * id), `repo:<url>@<7-40 hex sha>`, and `doc:<repo-relative-path>` — see
 * CLAUDE.md → "Sources". Every reference must resolve: paper/repo refs
 * against docs/papers/index.yaml, doc refs against a file that exists on disk.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../lib/paths.ts";
import { parseSourceRef } from "../../lib/source-ref.ts";
import type { Diagnostic, ValidationContext } from "../types.ts";

const REPO_REF_RE = /^repo:https?:\/\/[^@]+@[0-9a-f]{7,40}$/;

function checkSingleSourceRef(
    diagnostics: Diagnostic[],
    ctx: ValidationContext,
    file: string,
    field: string,
    value: string,
): void {
    const { kind, key } = parseSourceRef(value);

    if (kind === "paper") {
        if (!ctx.sourceIndex.has(key)) {
            diagnostics.push({ level: "error", message: `[${file}] ${field} "${value}" not found in docs/papers/index.yaml` });
        }
    } else if (kind === "repo") {
        if (!REPO_REF_RE.test(value)) {
            diagnostics.push({
                level: "error",
                message: `[${file}] ${field} "${value}" malformed (expected paper:<id> | repo:<url>@<7-40 hex> | doc:<path>)`,
            });
            return;
        }
        if (!ctx.sourceIndex.has(key)) {
            diagnostics.push({ level: "error", message: `[${file}] ${field} "${value}" not found in docs/papers/index.yaml` });
        }
    } else {
        // doc
        const docPath = value.slice("doc:".length);
        const absPath = join(REPO_ROOT, docPath);
        if (!existsSync(absPath)) {
            diagnostics.push({ level: "error", message: `[${file}] ${field} "${value}" file does not exist` });
        }
    }
}

function checkSourceIds(diagnostics: Diagnostic[], ctx: ValidationContext, file: string, sources: unknown): void {
    if (!sources || typeof sources !== "object") return;
    const src = sources as { primary?: string; references?: string[] };
    if (src.primary) {
        checkSingleSourceRef(diagnostics, ctx, file, "sources.primary", src.primary);
    }
    for (const ref of src.references ?? []) {
        checkSingleSourceRef(diagnostics, ctx, file, "sources.references", ref);
    }
}

export function sourcesRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const e of [...ctx.algoFiltered, ...ctx.modelFiltered]) {
        checkSourceIds(diagnostics, ctx, e.file, e.frontmatter.sources);
    }
    // Concept pages: sources optional, skip validation if absent.
    for (const e of ctx.conceptFiltered) {
        const sources = e.frontmatter.sources as { primary?: string; references?: string[] } | undefined;
        if (sources?.primary || (sources?.references && sources.references.length > 0)) {
            checkSourceIds(diagnostics, ctx, e.file, sources);
        }
    }

    return diagnostics;
}
