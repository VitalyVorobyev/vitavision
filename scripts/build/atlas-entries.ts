/**
 * Atlas-entry mappers for content:build.
 *
 * "Atlas" pages are algorithms, models, and concepts — the three content kinds
 * that share the content graph (scripts/content-graph.ts), the narrative
 * page/paper lookup (scripts/narrative-build.ts#AtlasPageLookup), and the
 * search index (scripts/content-search.ts). Each of those three consumers
 * needs the same per-entry projection applied across all three kinds; this
 * module holds one mapper per consumer, replacing what was previously three
 * separate copy-pasted `.map()` calls (one per kind) at each of the three
 * call sites in content-build.ts.
 */
import type { AlgorithmEntry, ModelEntry, ConceptEntry } from "../../src/lib/content/schema.ts";
import type { AtlasPageLookup } from "../narrative-build.ts";
import type { ContentEntry } from "../content-graph.ts";
import type { SearchEntry } from "../content-search.ts";
import type { PageSourcesEntry } from "../authors-build.ts";

export type AtlasEntryKind = "algorithm" | "model" | "concept";
export type AtlasEntry = AlgorithmEntry | ModelEntry | ConceptEntry;

/** Fields shared by all three atlas frontmatter shapes but not lifted into one common type in schema.ts. */
type AtlasFrontmatterExtras = {
    year?: number;
    quality?: string;
    domain?: string;
    prerequisites?: string[];
    failureModes?: string[];
    relations?: ContentEntry["relations"];
    sources?: { primary?: string };
};

function extras(entry: AtlasEntry): AtlasFrontmatterExtras {
    return entry.frontmatter as AtlasFrontmatterExtras;
}

/** Projects one atlas entry into the lookup narrative resolution uses to resolve `page` nodes. */
export function toAtlasPageLookup(entry: AtlasEntry, kind: AtlasEntryKind): AtlasPageLookup {
    return {
        slug: entry.slug,
        title: entry.frontmatter.title,
        pageKind: kind,
        year: extras(entry).year,
        quality: extras(entry).quality,
    };
}

/** Builds the `slug -> AtlasPageLookup` map used to resolve narrative `page` nodes, across all three atlas kinds. */
export function buildAtlasBySlug(
    algorithmPages: AlgorithmEntry[],
    modelPages: ModelEntry[],
    conceptPages: ConceptEntry[],
): Map<string, AtlasPageLookup> {
    const atlasBySlug = new Map<string, AtlasPageLookup>();
    for (const e of algorithmPages) atlasBySlug.set(e.slug, toAtlasPageLookup(e, "algorithm"));
    for (const e of modelPages) atlasBySlug.set(e.slug, toAtlasPageLookup(e, "model"));
    for (const e of conceptPages) atlasBySlug.set(e.slug, toAtlasPageLookup(e, "concept"));
    return atlasBySlug;
}

/** Projects one atlas entry into a content-graph node entry. */
export function toContentGraphEntry(entry: AtlasEntry, kind: AtlasEntryKind): ContentEntry {
    return {
        slug: entry.slug,
        type: kind,
        title: entry.frontmatter.title,
        summary: entry.frontmatter.summary,
        draft: entry.frontmatter.draft === true,
        prerequisites: extras(entry).prerequisites,
        failureModes: extras(entry).failureModes,
        relations: extras(entry).relations,
    };
}

/** Builds the flat `ContentEntry[]` fed into `buildContentGraph`, across all three atlas kinds (published-only). */
export function buildAtlasGraphEntries(
    algorithmPublished: AlgorithmEntry[],
    modelPublished: ModelEntry[],
    conceptPublished: ConceptEntry[],
): ContentEntry[] {
    return [
        ...algorithmPublished.map((e) => toContentGraphEntry(e, "algorithm")),
        ...modelPublished.map((e) => toContentGraphEntry(e, "model")),
        ...conceptPublished.map((e) => toContentGraphEntry(e, "concept")),
    ];
}

/** Projects the published atlas entries into the `{slug, sources}` shape authors-build.ts consumes, across all three kinds. */
export function buildAtlasAuthorPages(
    algorithmPublished: AlgorithmEntry[],
    modelPublished: ModelEntry[],
    conceptPublished: ConceptEntry[],
): PageSourcesEntry[] {
    return [
        ...algorithmPublished.map((e) => ({ slug: e.slug, sources: e.frontmatter.sources })),
        ...modelPublished.map((e) => ({ slug: e.slug, sources: e.frontmatter.sources })),
        ...conceptPublished.map((e) => ({ slug: e.slug, sources: e.frontmatter.sources })),
    ];
}

/** Resolves a page's `sources.primary` paper id to display metadata, or `undefined` when unresolvable. */
export type ResolvePrimary = (fm: { sources?: { primary?: string } }) => { authors?: string[]; venue?: string } | undefined;

/** Projects one atlas entry into a search-index entry. */
export function toAtlasSearchEntry(entry: AtlasEntry, kind: AtlasEntryKind, resolvePrimary: ResolvePrimary): SearchEntry {
    return {
        slug: entry.slug,
        type: kind,
        title: entry.frontmatter.title,
        summary: entry.frontmatter.summary,
        tags: entry.frontmatter.tags,
        domain: extras(entry).domain,
        html: entry.html,
        primary: resolvePrimary(entry.frontmatter),
    };
}

/** Builds the flat `SearchEntry[]` for the atlas portion of the search index, across all three atlas kinds (published-only). */
export function buildAtlasSearchEntries(
    algorithmPublished: AlgorithmEntry[],
    modelPublished: ModelEntry[],
    conceptPublished: ConceptEntry[],
    resolvePrimary: ResolvePrimary,
): SearchEntry[] {
    return [
        ...algorithmPublished.map((e) => toAtlasSearchEntry(e, "algorithm", resolvePrimary)),
        ...modelPublished.map((e) => toAtlasSearchEntry(e, "model", resolvePrimary)),
        ...conceptPublished.map((e) => toAtlasSearchEntry(e, "concept", resolvePrimary)),
    ];
}
