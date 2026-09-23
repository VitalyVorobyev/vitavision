/**
 * Content search record builder.
 * Extracts searchable metadata from processed content entries and
 * emits src/generated/content-search.ts as a typed TypeScript literal.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { paperNicknameTags } from "../src/lib/atlas/paperView.ts";
export { paperNicknameTags };

export interface SearchRecord {
    slug: string;
    path: string;
    type: "algorithm" | "model" | "concept" | "narrative" | "author" | "paper";
    title: string;
    summary: string;
    tags: string[];
    /** Unified domain taxonomy value (replaces per-kind category). */
    domain?: string;
    headings: string[];
    /** Source paper authors, joined from `frontmatter.sources.primary`. */
    authors?: string[];
    /** Source paper venue (e.g. "CVPR", "ECCV"). */
    venue?: string;
}

/** Extract text content of <h2> and <h3> headings from rendered HTML. */
export function extractHeadings(html: string): string[] {
    const results: string[] = [];
    const regex = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
        const text = match[1].trim();
        if (text) results.push(text);
    }
    return results;
}

export interface SearchEntry {
    slug: string;
    type: "algorithm" | "model" | "concept" | "narrative";
    title: string;
    summary: string;
    tags: string[];
    /** Unified domain taxonomy value. */
    domain?: string;
    html: string;
    /** Optional resolved primary-paper metadata (authors, venue). */
    primary?: { authors?: string[]; venue?: string };
}

/** Build search records from processed entries. Drafts must be pre-filtered by the caller. */
export function buildSearchRecords(entries: SearchEntry[]): SearchRecord[] {
    return entries.map((e) => {
        // Single global slug namespace for atlas pages: every algorithm/model/
        // concept page routes through /atlas/<slug>. Narratives are NOT atlas
        // pages (see content-graph.ts) and route through /atlas/narratives/<slug>.
        const path = e.type === "narrative" ? `/atlas/narratives/${e.slug}` : `/atlas/${e.slug}`;

        return {
            slug: e.slug,
            path,
            type: e.type,
            title: e.title,
            summary: e.summary,
            tags: e.tags,
            ...(e.domain !== undefined ? { domain: e.domain } : {}),
            headings: extractHeadings(e.html),
            ...(e.primary?.authors && e.primary.authors.length > 0 ? { authors: e.primary.authors } : {}),
            ...(e.primary?.venue ? { venue: e.primary.venue } : {}),
        };
    });
}

/** Minimal author shape needed for a search record — a subset of `AuthorRef`. */
export interface AuthorSearchEntry {
    id: string;
    name: string;
    papers: string[];
}

/**
 * Build search records for the author register (`/authors/<id>`). Authors have
 * no body text, so the name goes in `title` alone — repeating it in the
 * `authors` field would only add bytes, since the client boosts `title` (3)
 * above `authors` (2.5) anyway. Records are kept deliberately lean: there are
 * ~500 of them and they ship in the same lazy chunk as the atlas index.
 *
 * Collision safety: author ids are OpenAlex ids (`A\d{7,10}`, e.g.
 * "A5049246408"), which can never collide with a kebab-case page slug or a
 * `paper:<id>`-prefixed paper slug, so no extra namespacing is needed here.
 * Callers must pass only canonical authors (e.g. `authorsIndex.authors`,
 * whose keys are already alias-resolved by `buildAuthorsIndex` — a merged
 * duplicate identity's id never appears there, only its canonical id does).
 */
export function buildAuthorSearchRecords(authors: AuthorSearchEntry[]): SearchRecord[] {
    return authors.map((a) => ({
        slug: a.id,
        path: `/authors/${a.id}`,
        type: "author" as const,
        title: a.name,
        summary: `${a.papers.length} paper${a.papers.length === 1 ? "" : "s"}`,
        tags: [],
        headings: [],
    }));
}

/** Minimal paper shape needed for a search record — a subset of `PaperRefRecord`. */
export interface PaperSearchEntry {
    id: string;
    title: string;
    authors: string[];
    venue: string;
    year: number;
}

/**
 * "<venue> <year>", without duplicating the year when `venue` already ends
 * with it (docs/papers/index.yaml venue strings are inconsistent — some are
 * bare ("CVPR", "arXiv"), some already embed the year ("CVPR 2016", "arXiv
 * (2025)") — a plain concatenation would render "CVPR 2016 2016" for the
 * latter).
 */
function paperSummary(venue: string, year: number): string {
    const yearStr = year ? String(year) : "";
    if (!yearStr) return venue;
    if (!venue) return yearStr;
    const trailingYear = venue.match(/(\d{4})\)?\s*$/);
    if (trailingYear && trailingYear[1] === yearStr) return venue;
    return `${venue} ${yearStr}`;
}

/**
 * Build search records for the paper register (`/papers/<id>`), kind:paper
 * entries only. The slug is prefixed `paper:` (never a bare id) so it can
 * never collide with an atlas page slug in MiniSearch's `idField` — see
 * `searchSlugs` in `src/lib/atlas/searchClient.ts`, which filters these (and
 * author records) out of the Atlas-catalog slug set. Records are kept lean:
 * they ship in the same lazy chunk as the atlas index.
 */
export function buildPaperSearchRecords(papers: PaperSearchEntry[]): SearchRecord[] {
    return papers.map((p) => ({
        slug: `paper:${p.id}`,
        path: `/papers/${p.id}`,
        type: "paper" as const,
        title: p.title,
        summary: paperSummary(p.venue, p.year),
        tags: paperNicknameTags(p.id),
        headings: [],
        ...(p.authors.length > 0 ? { authors: p.authors } : {}),
        ...(p.venue ? { venue: p.venue } : {}),
    }));
}

/**
 * Write src/generated/content-search.ts as a typed TypeScript literal.
 */
export function emitContentSearch(records: SearchRecord[], outDir: string): void {
    const filePath = join(outDir, "content-search.ts");

    const lines: string[] = [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        "",
        "export interface SearchRecord {",
        "    slug: string;",
        "    path: string;",
        "    type: \"algorithm\" | \"model\" | \"concept\" | \"narrative\" | \"author\" | \"paper\";",
        "    title: string;",
        "    summary: string;",
        "    tags: string[];",
        "    domain?: string;",
        "    headings: string[];",
        "    authors?: string[];",
        "    venue?: string;",
        "}",
        "",
        `export const searchRecords: SearchRecord[] = ${JSON.stringify(records, null, 2)};`,
        "",
    ];

    writeFileSync(filePath, lines.join("\n"), "utf-8");
}
