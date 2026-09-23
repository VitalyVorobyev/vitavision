/**
 * content:build orchestration.
 *
 * Loads every content kind (blog, algorithm, demo, model, concept, narrative)
 * from `content/**`, renders markdown to sanitized HTML, serializes frontmatter,
 * resolves cross-content graphs (atlas relations, narratives), and emits
 * everything under `src/generated/**` + `public/*-index.json`. The actual work
 * is split across `scripts/build/**` (render pipeline, serialization,
 * generated-output emission, atlas-entry mapping, build guards) plus the
 * existing `content-graph.ts` / `content-search.ts` / `narrative-build.ts` /
 * `authors-build.ts` modules — this file wires them together in order.
 */
import { join } from "node:path";

import {
    blogFrontmatterSchema,
    algorithmFrontmatterSchema,
    demoFrontmatterSchema,
    modelFrontmatterSchema,
    conceptFrontmatterSchema,
    narrativeFrontmatterSchema,
} from "../src/lib/content/schema.ts";
import type {
    BlogEntry,
    AlgorithmEntry,
    DemoEntry,
    ModelEntry,
    ConceptEntry,
    NarrativeEntry,
    NarrativeFrontmatterSerialized,
} from "../src/lib/content/schema.ts";

import { processDirectory, createShikiHighlighter } from "./build/render.ts";
import { serializeFilterSort, serializeNarrativeFrontmatter, byTitleAsc, byDateDesc } from "./build/serialize.ts";
import { checkEmptyDivGuard, checkModelImplementationsGuard } from "./build/guards.ts";
import { generateOutput, emitPapersIndex } from "./build/emit.ts";
import {
    buildAtlasBySlug,
    buildAtlasGraphEntries,
    buildAtlasSearchEntries,
    buildAtlasAuthorPages,
} from "./build/atlas-entries.ts";
import { makePrimaryYearResolver, makePrimaryDisplayResolver, collectUsedPrimaryIds } from "./build/primary-source.ts";

import { buildContentGraph, emitContentGraph } from "./content-graph.ts";
import { buildAuthorSearchRecords, buildSearchRecords, emitContentSearch } from "./content-search.ts";
import type { SearchEntry } from "./content-search.ts";
import {
    resolveNarrative,
    sliceChapters,
    buildNarrativeRefs,
    emitNarrativeRefs,
} from "./narrative-build.ts";
import type { PaperLookup } from "./narrative-build.ts";
import { emitAuthorsIndex } from "./authors-build.ts";

import { CONTENT_DIR, GENERATED_DIR, PAPERS_INDEX_PATH } from "./lib/paths.ts";
import { loadIndexEntries, paperRefRecords } from "./lib/papers-index.ts";
import type { PaperRefRecord } from "./lib/papers-index.ts";
import { algoSlug, modelSlug, conceptSlug, narrativeSlug, demoSlug, blogSlug } from "./lib/content-kinds.ts";

function loadPapersIndex(): PaperRefRecord[] {
    const entries = loadIndexEntries(PAPERS_INDEX_PATH, {
        onMissing: () => {
            console.warn("content:build — docs/papers/index.yaml not found; papers-index will be empty");
            return [];
        },
        onNotList: () => {
            console.warn("content:build — docs/papers/index.yaml is not a list; papers-index will be empty");
            return [];
        },
    });
    return paperRefRecords(entries);
}

async function main(): Promise<void> {
    const highlighter = await createShikiHighlighter();

    const rawBlogPosts = await processDirectory(join(CONTENT_DIR, "blog"), blogFrontmatterSchema, blogSlug, highlighter);

    const includeDrafts = process.env.INCLUDE_DRAFTS === "true";
    const notDev = (e: { frontmatter: { dev?: boolean } }) => !e.frontmatter.dev;

    // Serialize dates, filter drafts, and sort by date descending
    const blogPosts = serializeFilterSort<BlogEntry>(rawBlogPosts, includeDrafts, byDateDesc);

    const rawAlgorithmPages = await processDirectory(join(CONTENT_DIR, "algorithms"), algorithmFrontmatterSchema, algoSlug, highlighter);

    // algorithmPages: routable set (used for per-slug HTML loaders). Dev pages stay here.
    const algorithmPages = serializeFilterSort<AlgorithmEntry>(rawAlgorithmPages, includeDrafts, byTitleAsc);
    // algorithmPublished: published index/graph/search set — excludes dev: true pages.
    const algorithmPublished = algorithmPages.filter(notDev);

    const rawDemoPages = await processDirectory(join(CONTENT_DIR, "demos"), demoFrontmatterSchema, demoSlug, highlighter);
    const demoPages = serializeFilterSort<DemoEntry>(rawDemoPages, includeDrafts, byTitleAsc);

    const rawModelPages = await processDirectory(join(CONTENT_DIR, "models"), modelFrontmatterSchema, modelSlug, highlighter);
    checkModelImplementationsGuard(rawModelPages);
    const modelPages = serializeFilterSort<ModelEntry>(rawModelPages, includeDrafts, byTitleAsc);
    const modelPublished = modelPages.filter(notDev);

    const rawConceptPages = await processDirectory(join(CONTENT_DIR, "concepts"), conceptFrontmatterSchema, conceptSlug, highlighter);
    const conceptPages = serializeFilterSort<ConceptEntry>(rawConceptPages, includeDrafts, byTitleAsc);
    const conceptPublished = conceptPages.filter(notDev);

    const rawNarrativePages = await processDirectory(join(CONTENT_DIR, "narratives"), narrativeFrontmatterSchema, narrativeSlug, highlighter);

    // Serialize + draft-filter now; graph resolution (page/paper lookups, the
    // generated timeline lens) happens below once atlas years are known.
    const narrativeFrontmatters = rawNarrativePages
        .map((e) => ({
            slug: e.slug,
            html: e.html,
            frontmatter: serializeNarrativeFrontmatter<NarrativeFrontmatterSerialized>(e.frontmatter as Record<string, unknown>),
        }))
        .filter((e) => includeDrafts || !e.frontmatter.draft)
        .sort(byTitleAsc);

    // Load papers once, early, so we can derive `year` before emitting the index.
    const papers = loadPapersIndex();
    const papersById = new Map(papers.map((p) => [p.id, p]));
    const resolvePrimaryYear = makePrimaryYearResolver(papersById);
    for (const e of [...algorithmPages, ...modelPages, ...conceptPages]) {
        const y = resolvePrimaryYear(e.frontmatter as { sources?: { primary?: string } });
        if (y !== undefined) (e.frontmatter as { year?: number }).year = y;
    }

    // Resolve narrative graphs now that atlas page years are known. Uses the
    // full (draft-inclusive under INCLUDE_DRAFTS=true) algorithm/model/concept
    // sets so a narrative can reference any page; validate-content.ts is the
    // gate that rejects a `page` node pointing at an unpublished/draft slug.
    const atlasBySlug = buildAtlasBySlug(algorithmPages, modelPages, conceptPages);
    const narrativePapersById = new Map<string, PaperLookup>(
        papers.map((p) => [p.id, { id: p.id, title: p.title, authors: p.authors, year: p.year, url: p.url }]),
    );

    const narrativePages: NarrativeEntry[] = narrativeFrontmatters.map((e) => {
        const chapters = sliceChapters(e.html);
        const narrative = resolveNarrative(e.frontmatter, atlasBySlug, narrativePapersById);
        return { slug: e.slug, frontmatter: e.frontmatter, html: e.html, chapters, narrative };
    });

    checkEmptyDivGuard([
        ...rawBlogPosts,
        ...rawAlgorithmPages,
        ...rawDemoPages,
        ...rawModelPages,
        ...rawConceptPages,
        ...rawNarrativePages,
    ]);

    generateOutput({
        blogPosts,
        algorithmPages,
        demoPages,
        modelPages,
        conceptPages,
        algorithmPublished,
        modelPublished,
        conceptPublished,
        narrativePages,
    });

    // Draft narratives are excluded from every downstream reverse index (refs,
    // search): unlike atlas pages, narratives are not content-graph nodes, so
    // those consumers have no downstream draft flag to filter on themselves.
    const publishedNarratives = narrativePages.filter((e) => e.frontmatter.draft !== true);

    // Reverse index: which narratives reference a given atlas page. Small
    // standalone module — not part of content-graph.ts (narratives are
    // deliberately not content-graph nodes).
    emitNarrativeRefs(
        buildNarrativeRefs(publishedNarratives.map((e) => ({ slug: e.slug, title: e.frontmatter.title, narrative: e.narrative }))),
        GENERATED_DIR,
    );

    // Emit a typed lookup for paper IDs referenced by `sources.primary`.
    // Source-strip rendering (Atlas page redesign) reads this on the client.
    const usedPrimaryIds = collectUsedPrimaryIds([algorithmPublished, modelPublished, conceptPublished]);
    emitPapersIndex(papers, usedPrimaryIds);

    // Emit the authors index: author metadata (once docs/papers/authors.yaml
    // exists) plus a reverse lookup of which published atlas pages cite a
    // given paper. Empty inputs (no authors.yaml, no authorIds yet) produce
    // an empty-but-valid index — see scripts/authors-build.ts.
    const authorsIndex = emitAuthorsIndex(buildAtlasAuthorPages(algorithmPublished, modelPublished, conceptPublished));
    const resolvePrimary = makePrimaryDisplayResolver(papersById);

    // Build content graph from all non-draft, non-dev entries.
    // dev:true pages are excluded from relationship edges and slug lookups so
    // they do not appear in navigation. They remain routable via direct URL.
    const graphEntries = buildAtlasGraphEntries(algorithmPublished, modelPublished, conceptPublished);
    const contentGraph = buildContentGraph(graphEntries);
    emitContentGraph(contentGraph, GENERATED_DIR);

    // Build search records from all non-draft, non-dev entries.
    const searchEntries: SearchEntry[] = [
        ...buildAtlasSearchEntries(algorithmPublished, modelPublished, conceptPublished, resolvePrimary),
        ...publishedNarratives.map((e) => ({
            slug: e.slug,
            type: "narrative" as const,
            title: e.frontmatter.title,
            summary: e.frontmatter.summary,
            tags: e.frontmatter.tags,
            html: e.html,
        })),
    ];

    // Author register records live in the same index so a surname query can
    // resolve to the person's page, not only to the pages citing their work.
    const authorSearchRecords = buildAuthorSearchRecords(
        Object.entries(authorsIndex.authors).map(([id, ref]) => ({
            id,
            name: ref.name,
            papers: ref.papers,
        })),
    );
    const searchRecords = [...buildSearchRecords(searchEntries), ...authorSearchRecords];
    emitContentSearch(searchRecords, GENERATED_DIR);

    // Run validation after all content is processed.
    const { validateContent } = await import("./validate-content.ts");
    const validationErrors = await validateContent({
        includeDrafts,
        publishedGraph: contentGraph,
    });

    if (validationErrors.length > 0) {
        for (const err of validationErrors) {
            console.error(`  ERROR ${err}`);
        }
        throw new Error(`content:validate failed with ${validationErrors.length} error(s)`);
    }

    console.log(
        `content:build — ${blogPosts.length} blog post(s), ${algorithmPages.length} algorithm page(s), ${demoPages.length} demo page(s), ${modelPages.length} model page(s), ${conceptPages.length} concept page(s), ${narrativePages.length} narrative(s) → ${GENERATED_DIR}`,
    );

    highlighter.dispose();
}

if (import.meta.main) {
    main().catch((err) => {
        console.error("content:build failed:", err);
        process.exit(1);
    });
}
