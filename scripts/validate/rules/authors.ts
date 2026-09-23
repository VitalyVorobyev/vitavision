/**
 * Rule 16: author registry integrity.
 *
 * Cross-checks docs/papers/index.yaml's `authorIds` against
 * docs/papers/authors.yaml (see CLAUDE.md → "Authors registry" and the
 * `author-identity` skill):
 *
 * - an `authorIds` entry not present in authors.yaml → ERROR (a dangling id
 *   breaks `/authors/<id>` resolution for that paper).
 * - a paper entry (kind `paper`, or `kind` omitted) with no `authorIds` at
 *   all → WARNING. OpenAlex sometimes has no record at all for a paper (or
 *   its own authorship list lacks ids), so this is tracked, not fatal.
 * - `authorIds.length !== authors.length` → WARNING, naming both counts.
 *   The two arrays are not position-aligned (surname-matched at render time
 *   — see `src/lib/atlas/authorLinks.ts`), so a mismatch isn't necessarily
 *   wrong, just worth a human glance (OpenAlex occasionally drops an author
 *   from a work record, or lacks an id for one of them).
 * - a `mergedInto` target that doesn't exist in authors.yaml, or that forms
 *   a cycle, → ERROR.
 */
import { buildAliasResolver } from "../../lib/authors.ts";
import type { Diagnostic, ValidationContext } from "../types.ts";

export function authorsRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // ── authorIds ↔ authors.yaml cross-check ────────────────────────────────
    for (const entry of ctx.sourceIndex.values()) {
        if ((entry.kind ?? "paper") !== "paper") continue;

        const authorIds = entry.authorIds ?? [];
        for (const id of authorIds) {
            if (!ctx.authorIds.has(id)) {
                diagnostics.push({
                    level: "error",
                    message: `[docs/papers/index.yaml] paper "${entry.id}" authorIds entry "${id}" not found in docs/papers/authors.yaml`,
                });
            }
        }

        if (authorIds.length === 0) {
            diagnostics.push({
                level: "warning",
                message: `[docs/papers/index.yaml] paper "${entry.id}" has no authorIds`,
            });
        } else {
            const authorsCount = (entry.authors ?? []).length;
            if (authorIds.length !== authorsCount) {
                diagnostics.push({
                    level: "warning",
                    message: `[docs/papers/index.yaml] paper "${entry.id}" authorIds count (${authorIds.length}) does not match authors count (${authorsCount})`,
                });
            }
        }
    }

    // ── mergedInto target existence + cycle detection ───────────────────────
    const byId = new Map(ctx.authorRecords.map((r) => [r.id, r]));
    const { resolve } = buildAliasResolver(ctx.authorRecords);
    const reportedCycleCanonicals = new Set<string>();

    for (const r of ctx.authorRecords) {
        if (!r.mergedInto) continue;

        if (!byId.has(r.mergedInto)) {
            diagnostics.push({
                level: "error",
                message: `[docs/papers/authors.yaml] author "${r.id}" mergedInto target "${r.mergedInto}" does not exist in authors.yaml`,
            });
            continue;
        }

        // A well-formed chain terminates at a row with no mergedInto. If the
        // id this row resolves to STILL carries mergedInto, buildAliasResolver
        // hit a cycle and fell back to its lexicographically-smallest-id rule
        // — report once per cycle (keyed by that fallback canonical id).
        const canonical = resolve(r.id);
        if (byId.get(canonical)?.mergedInto && !reportedCycleCanonicals.has(canonical)) {
            reportedCycleCanonicals.add(canonical);
            diagnostics.push({
                level: "error",
                message: `[docs/papers/authors.yaml] mergedInto cycle detected involving "${r.id}" (resolves to "${canonical}", which itself has mergedInto set)`,
            });
        }
    }

    return diagnostics;
}
