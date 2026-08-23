import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

// `fileURLToPath(import.meta.url)` (rather than Bun's `import.meta.dir`) so this
// module's path constants resolve under both `bun run` and vitest/Node — the
// latter is how scripts/authors-build.test.ts exercises the pure functions below.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const AUTHORS_YAML_PATH = join(SCRIPT_DIR, "..", "docs", "papers", "authors.yaml");
const PAPERS_INDEX_PATH = join(SCRIPT_DIR, "..", "docs", "papers", "index.yaml");
const PUBLIC_DIR = join(SCRIPT_DIR, "..", "public");
const GENERATED_DIR = join(SCRIPT_DIR, "..", "src", "generated");

/** One row of docs/papers/authors.yaml. Not yet populated by any script — the
 *  future `papers-backfill-authors.ts` writes it. Absence is a normal, valid state. */
export interface AuthorRecord {
    id: string;
    name: string;
    orcid?: string;
}

/** A single paper entry from docs/papers/index.yaml, narrowed to the fields
 *  this module cares about. `authorIds` does not exist on any entry yet — it
 *  arrives via a future backfill script. */
interface PaperIndexAuthorFields {
    id?: string;
    kind?: "paper" | "repo" | "doc";
    authorIds?: string[];
}

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
}

/** Reads docs/papers/authors.yaml. Tolerates absence or a malformed/non-list
 *  file by returning an empty array — authors.yaml does not exist yet. */
export function loadAuthorsYaml(): AuthorRecord[] {
    if (!existsSync(AUTHORS_YAML_PATH)) return [];
    const raw = readFileSync(AUTHORS_YAML_PATH, "utf-8");
    const parsed = parseYaml(raw);
    if (!Array.isArray(parsed)) {
        console.warn("authors:build — docs/papers/authors.yaml is not a list; authors will be empty");
        return [];
    }
    const records: AuthorRecord[] = [];
    for (const entry of parsed as AuthorRecord[]) {
        if (!entry?.id || !entry?.name) continue;
        records.push({
            id: entry.id,
            name: entry.name,
            ...(entry.orcid ? { orcid: entry.orcid } : {}),
        });
    }
    return records;
}

/** Reads docs/papers/index.yaml and extracts `{ paperId, authorIds }` for
 *  every paper entry that already carries `authorIds`. Tolerates the file
 *  being absent, not a list, or every entry lacking `authorIds` — no paper
 *  has this field yet; it arrives via a future backfill script. */
export function loadPaperAuthorIds(): { paperId: string; authorIds: string[] }[] {
    if (!existsSync(PAPERS_INDEX_PATH)) return [];
    const raw = readFileSync(PAPERS_INDEX_PATH, "utf-8");
    const parsed = parseYaml(raw);
    if (!Array.isArray(parsed)) return [];
    const out: { paperId: string; authorIds: string[] }[] = [];
    for (const entry of parsed as PaperIndexAuthorFields[]) {
        const kind = entry.kind ?? "paper";
        if (kind !== "paper") continue;
        if (!entry.id) continue;
        if (!Array.isArray(entry.authorIds) || entry.authorIds.length === 0) continue;
        out.push({ paperId: entry.id, authorIds: entry.authorIds });
    }
    return out;
}

/** Strips a `paper:` prefix and normalizes; returns undefined for `repo:`/`doc:`
 *  refs (and any other non-paper prefix), which carry no author data. */
export function normalizeSourceId(raw: string): string | undefined {
    const id = raw.startsWith("paper:") ? raw.slice("paper:".length) : raw;
    if (id.startsWith("repo:") || id.startsWith("doc:")) return undefined;
    return id;
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

/** Pure assembly of the authors index from already-loaded inputs. */
export function buildAuthorsIndex(
    authorRecords: AuthorRecord[],
    paperAuthorIds: { paperId: string; authorIds: string[] }[],
    pagesByPaper: Record<string, string[]>,
): AuthorsIndex {
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

    return { authors, paperAuthors, pagesByPaper };
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
