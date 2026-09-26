import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { PAPERS_INDEX_PATH, PUBLIC_DIR, GENERATED_DIR } from "./lib/paths.ts";
import { loadIndexEntries, paperAuthorIds as papersIndexAuthorIds } from "./lib/papers-index.ts";
import { loadAuthorsYaml, buildAliasResolver } from "./lib/authors.ts";
import type { AuthorRecord } from "./lib/authors.ts";
import { normalizeSourceId } from "./lib/source-ref.ts";

export { loadAuthorsYaml, buildAliasResolver };
export type { AuthorRecord };
export { normalizeSourceId };

/** A published atlas page's slug and its `sources` frontmatter, the minimal
 *  shape this module needs to derive `pagesByPaper`. Structurally compatible
 *  with AlgorithmFrontmatter/ModelFrontmatter/ConceptFrontmatter's `sources`
 *  field without importing those types, to keep this module decoupled. */
export interface PageSourcesEntry {
    slug: string;
    sources?: {
        primary?: string;
        references?: string[];
    };
}

export interface AuthorRef {
    name: string;
    orcid?: string;
    papers: string[];
}

export interface AuthorsIndex {
    authors: Record<string, AuthorRef>;
    paperAuthors: Record<string, string[]>;
    pagesByPaper: Record<string, string[]>;
    /** Alias id → canonical id, flattened to the final canonical id (cycle-safe). */
    aliases: Record<string, string>;
    /** Symmetric co-author counts over unordered pairs of alias-resolved, per-paper-deduped author ids. */
    coauthors: Record<string, Record<string, number>>;
}

/** Reads docs/papers/index.yaml and extracts `{ paperId, authorIds }` for
 *  every paper entry that already carries `authorIds`. Tolerates the file
 *  being absent, not a list, or every entry lacking `authorIds` — no paper
 *  has this field yet; it arrives via a future backfill script. */
export function loadPaperAuthorIds(): { paperId: string; authorIds: string[] }[] {
    return papersIndexAuthorIds(loadIndexEntries(PAPERS_INDEX_PATH, { onMissing: () => [] }));
}

/** Derives, for every paper id referenced by a published page's
 *  `sources.primary` or `sources.references`, the sorted list of atlas
 *  slugs that reference it. `repo:`/`doc:` refs are ignored. */
export function buildPagesByPaper(pages: PageSourcesEntry[]): Record<string, string[]> {
    const bySlug = new Map<string, Set<string>>();
    for (const { slug, sources } of pages) {
        const ids = new Set<string>();
        if (sources?.primary) {
            const id = normalizeSourceId(sources.primary);
            if (id) ids.add(id);
        }
        for (const ref of sources?.references ?? []) {
            const id = normalizeSourceId(ref);
            if (id) ids.add(id);
        }
        for (const id of ids) {
            let slugs = bySlug.get(id);
            if (!slugs) {
                slugs = new Set();
                bySlug.set(id, slugs);
            }
            slugs.add(slug);
        }
    }
    const out: Record<string, string[]> = {};
    for (const [id, slugs] of bySlug) {
        out[id] = [...slugs].sort();
    }
    return out;
}

/** Symmetric co-author counts over unordered pairs within each paper's
 *  author-id list. Callers must pass already alias-resolved, per-paper-deduped
 *  ids (as `paperAuthors` in `buildAuthorsIndex` does) — this function does not
 *  resolve or dedupe on its own. A paper with 0 or 1 authors contributes no
 *  pairs. */
export function buildCoauthors(
    paperAuthorIds: { paperId: string; authorIds: string[] }[],
): Record<string, Record<string, number>> {
    const coauthors: Record<string, Record<string, number>> = {};
    const bump = (a: string, b: string) => {
        const row = (coauthors[a] ??= {});
        row[b] = (row[b] ?? 0) + 1;
    };
    for (const { authorIds } of paperAuthorIds) {
        for (let i = 0; i < authorIds.length; i++) {
            for (let j = i + 1; j < authorIds.length; j++) {
                bump(authorIds[i], authorIds[j]);
                bump(authorIds[j], authorIds[i]);
            }
        }
    }
    return coauthors;
}

/** Pure assembly of the authors index from already-loaded inputs. Every
 *  `authorIds` list is rewritten through the alias resolver and deduped per
 *  paper before `authors`/`paperAuthors`/`coauthors` are built, so merged rows
 *  never appear in the output — only their canonical id does. */
export function buildAuthorsIndex(
    authorRecords: AuthorRecord[],
    rawPaperAuthorIds: { paperId: string; authorIds: string[] }[],
    pagesByPaper: Record<string, string[]>,
): AuthorsIndex {
    const { resolve, aliases } = buildAliasResolver(authorRecords);

    const paperAuthorIds = rawPaperAuthorIds.map(({ paperId, authorIds }) => {
        const resolvedIds: string[] = [];
        const seen = new Set<string>();
        for (const rawId of authorIds) {
            const id = resolve(rawId);
            if (seen.has(id)) continue;
            seen.add(id);
            resolvedIds.push(id);
        }
        return { paperId, authorIds: resolvedIds };
    });

    const authorsById = new Map(authorRecords.map((a) => [a.id, a]));
    const authors: Record<string, AuthorRef> = {};
    const paperAuthors: Record<string, string[]> = {};

    for (const { paperId, authorIds } of paperAuthorIds) {
        paperAuthors[paperId] = authorIds;
        for (const authorId of authorIds) {
            let ref = authors[authorId];
            if (!ref) {
                const record = authorsById.get(authorId);
                ref = {
                    name: record?.name ?? authorId,
                    ...(record?.orcid ? { orcid: record.orcid } : {}),
                    papers: [],
                };
                authors[authorId] = ref;
            }
            ref.papers.push(paperId);
        }
    }
    for (const ref of Object.values(authors)) {
        ref.papers.sort();
    }

    const coauthors = buildCoauthors(paperAuthorIds);

    return { authors, paperAuthors, pagesByPaper, aliases, coauthors };
}

/** Writes public/authors-index.json (data) and src/generated/authors-index.ts
 *  (a tiny type shim + fetch URL, no data — mirrors src/generated/papers-index.ts). */
export function writeAuthorsIndexFiles(index: AuthorsIndex): void {
    const jsonPath = join(PUBLIC_DIR, "authors-index.json");
    writeFileSync(jsonPath, JSON.stringify(index, null, 2), "utf-8");

    const tsLines = [
        "// Auto-generated by scripts/authors-build.ts — do not edit manually.",
        "// The actual author records live in /authors-index.json (loaded lazily).",
        "",
        "export interface AuthorRef {",
        "    name: string;",
        "    orcid?: string;",
        "    papers: string[];",
        "}",
        "",
        "export interface AuthorsIndex {",
        "    authors: Record<string, AuthorRef>;",
        "    paperAuthors: Record<string, string[]>;",
        "    pagesByPaper: Record<string, string[]>;",
        "    aliases: Record<string, string>;",
        "    coauthors: Record<string, Record<string, number>>;",
        "}",
        "",
        "/** Public URL of the JSON asset emitted by content:build / authors:build. */",
        'export const AUTHORS_INDEX_URL = "/authors-index.json";',
        "",
    ];
    writeFileSync(join(GENERATED_DIR, "authors-index.ts"), tsLines.join("\n"), "utf-8");
}

/**
 * Full authors-index build: reads docs/papers/index.yaml + docs/papers/authors.yaml
 * (tolerating either being absent), derives `pagesByPaper` from the given published
 * atlas pages, and emits public/authors-index.json + src/generated/authors-index.ts.
 *
 * `pages` should be every published (non-draft) algorithm/model/concept page's
 * `{ slug, frontmatter.sources }`. Called by content-build.ts with in-memory data
 * right after the papers-index emission; the standalone `authors:build` entry
 * point below sources the same shape from the generated content-index.
 */
export function emitAuthorsIndex(pages: PageSourcesEntry[]): AuthorsIndex {
    const authorRecords = loadAuthorsYaml();
    const paperAuthorIds = loadPaperAuthorIds();
    const pagesByPaper = buildPagesByPaper(pages);
    const index = buildAuthorsIndex(authorRecords, paperAuthorIds, pagesByPaper);
    writeAuthorsIndexFiles(index);
    return index;
}

// ── Standalone entry point ────────────────────────────────────────────────────
if (import.meta.main) {
    const { algorithmPages, modelPages, conceptPages } = await import("../src/generated/content-index.ts");
    const pages: PageSourcesEntry[] = [...algorithmPages, ...modelPages, ...conceptPages]
        .filter((e) => e.frontmatter.draft !== true)
        .map((e) => ({ slug: e.slug, sources: e.frontmatter.sources }));
    const index = emitAuthorsIndex(pages);
    console.log(
        `authors:build — wrote public/authors-index.json ` +
        `(${Object.keys(index.authors).length} author(s), ${Object.keys(index.pagesByPaper).length} paper(s) linked to pages)`,
    );
}
