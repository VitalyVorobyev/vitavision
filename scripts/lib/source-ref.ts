/**
 * Parsing/normalizing helpers for the `sources.primary` / `sources.references`
 * source-ref strings used across content frontmatter: `paper:<id>` (or a bare
 * id, treated as `paper:<id>` for backward compatibility), `repo:<url>@<sha>`,
 * and `doc:<repo-relative-path>`.
 */
import type { SourceKind } from "./papers-index.ts";

/** Parse a source-ref string into a `{ kind, key }` pair. A bare id (no
 *  recognized prefix) is treated as a paper reference for backward
 *  compatibility. */
export function parseSourceRef(s: string): { kind: SourceKind; key: string } | null {
    if (s.startsWith("paper:")) {
        return { kind: "paper", key: s };
    }
    if (s.startsWith("repo:")) {
        return { kind: "repo", key: s };
    }
    if (s.startsWith("doc:")) {
        return { kind: "doc", key: s };
    }
    // Bare id → backward-compat paper reference.
    return { kind: "paper", key: `paper:${s}` };
}

/**
 * Extracts the bare paper id from a `sources.primary`-shaped ref, or
 * `undefined` when `primary` is absent or refers to a `repo:`/`doc:` source
 * (which carry no paper id). Strips a leading `paper:` prefix when present.
 *
 * This is the id-extraction logic that content-build.ts previously repeated
 * at three call sites (year resolution, papers-index usage tracking, and
 * author/venue lookup) — confirmed identical across all three before unifying.
 */
export function primaryPaperId(primary: string | undefined): string | undefined {
    if (!primary) return undefined;
    const id = primary.startsWith("paper:") ? primary.slice("paper:".length) : primary;
    if (id.startsWith("repo:") || id.startsWith("doc:")) return undefined;
    return id;
}

/** Strips a `paper:` prefix and normalizes; returns undefined for `repo:`/`doc:`
 *  refs (and any other reserved prefix), which carry no author data.
 *  Thin wrapper over `primaryPaperId` for a non-optional `raw` argument —
 *  historically defined in scripts/authors-build.ts, re-exported from there. */
export function normalizeSourceId(raw: string): string | undefined {
    return primaryPaperId(raw);
}
