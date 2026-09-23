/**
 * Builds the `ValidationContext` every validator rule consumes.
 *
 * `buildValidationContext` does ALL disk I/O: loads content/{algorithms,
 * models,concepts,narratives}, docs/papers/index.yaml, and content/tags.yaml,
 * then hands the raw, unparsed data to `buildContextCore` — the same
 * pure-data path `createContext` (the in-memory test builder) drives, so
 * disk-loaded and in-memory contexts are built identically after loading.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

import {
    algorithmFrontmatterSchema,
    modelFrontmatterSchema,
    conceptFrontmatterSchema,
    narrativeFrontmatterSchema,
} from "../../src/lib/content/schema.ts";
import type { ContentGraph, ContentEntry } from "../content-graph.ts";
import { buildContentGraph } from "../content-graph.ts";
import { computeReadingTimeMinutes } from "../reading-time.ts";
import { CONTENT_DIR, PAPERS_INDEX_PATH } from "../lib/paths.ts";
import { loadIndexEntries, paperYears as papersIndexYears, sourceKeyMap } from "../lib/papers-index.ts";
import type { RawIndexEntry } from "../lib/papers-index.ts";
import { parseSourceRef } from "../lib/source-ref.ts";
import { loadMarkdownDir, algoSlug, modelSlug, conceptSlug, narrativeSlug } from "../lib/content-kinds.ts";
import type { MarkdownDirEntry } from "../lib/content-kinds.ts";
import type { AtlasLookup, Diagnostic, ParsedEntry, TypedRelation, ValidationContext } from "./types.ts";

/**
 * Options for validateContent.
 * All fields optional; standalone invocation reads from env vars.
 */
export interface ValidateContentOptions {
    /** Override the draft filter. Defaults to INCLUDE_DRAFTS env var. */
    includeDrafts?: boolean;
    /** Pre-built published graph (from content-build.ts). Used for cycle detection only. */
    publishedGraph?: ContentGraph;
}

// ── Shared core input/logic (disk-loader and in-memory builder converge here) ──

/** Raw, unparsed input to the shared context-building core. */
interface RawContextInput {
    algorithms: MarkdownDirEntry[];
    models: MarkdownDirEntry[];
    concepts: MarkdownDirEntry[];
    narratives: MarkdownDirEntry[];
    indexEntries: RawIndexEntry[];
    /** Raw content/tags.yaml text, or `null` if the file does not exist. */
    tagsYamlText: string | null;
    includeDrafts: boolean;
    publishedGraph?: ContentGraph;
}

/** Backfills `readingTimeMinutes` (mutating `data` in place) when absent, same
 *  as content-build.ts's `processDirectory` — `loadMarkdownDir` itself does not,
 *  since not every caller wants this mutation. */
function backfillReadingTime(entries: MarkdownDirEntry[]): MarkdownDirEntry[] {
    return entries.map((e) => {
        if (e.data.readingTimeMinutes === undefined) {
            e.data.readingTimeMinutes = computeReadingTimeMinutes(e.content);
        }
        return e;
    });
}

function parseEntries(
    rawEntries: MarkdownDirEntry[],
    schemaFn: (data: Record<string, unknown>) => Record<string, unknown>,
    label: string,
    diagnostics: Diagnostic[],
): ParsedEntry[] {
    const out: ParsedEntry[] = [];
    for (const e of rawEntries) {
        try {
            const parsed = schemaFn(e.data);
            // Treat dev:true pages like drafts for validation purposes.
            const isDraft = !!(e.data.draft) || !!(e.data.dev);
            out.push({ ...e, frontmatter: parsed, isDraft });
        } catch (err) {
            diagnostics.push({
                level: "error",
                message: `[${e.file}] ${label} frontmatter parse error: ${String(err)}`,
            });
        }
    }
    return out;
}

type ParsedRelations = ContentEntry["relations"];

function entryToContentEntry(e: ParsedEntry, type: ContentEntry["type"]): ContentEntry {
    return {
        slug: e.slug,
        type,
        title: (e.frontmatter.title as string) ?? e.slug,
        summary: (e.frontmatter.summary as string) ?? "",
        prerequisites: e.frontmatter.prerequisites as string[] | undefined,
        failureModes: e.frontmatter.failureModes as string[] | undefined,
        relations: e.frontmatter.relations as ParsedRelations,
    };
}

function yearOfPrimary(fm: Record<string, unknown>, paperYears: Map<string, number>): number | undefined {
    const src = fm.sources as { primary?: string } | undefined;
    if (!src?.primary) return undefined;
    const parsed = parseSourceRef(src.primary);
    if (!parsed || parsed.kind !== "paper") return undefined;
    const bareId = parsed.key.slice("paper:".length);
    return paperYears.get(bareId);
}

function buildContextCore(input: RawContextInput): ValidationContext {
    const { includeDrafts } = input;

    const rawAlgoEntries = backfillReadingTime(input.algorithms);
    const rawModelEntries = backfillReadingTime(input.models);
    const rawConceptEntries = backfillReadingTime(input.concepts);
    const rawNarrativeEntries = backfillReadingTime(input.narratives);

    const loaderDiagnostics: Diagnostic[] = [];

    // ── Source index (also validates the reserved-prefix rule) ────────────
    const sourceIndexErrors: string[] = [];
    const sourceIndex = sourceKeyMap(input.indexEntries, sourceIndexErrors);
    for (const message of sourceIndexErrors) {
        loaderDiagnostics.push({ level: "error", message });
    }

    // ── Parse and filter ────────────────────────────────────────────────────
    const algoEntries = parseEntries(
        rawAlgoEntries,
        (d) => algorithmFrontmatterSchema.parse(d) as Record<string, unknown>,
        "algorithm",
        loaderDiagnostics,
    );
    const modelEntries = parseEntries(
        rawModelEntries,
        (d) => modelFrontmatterSchema.parse(d) as Record<string, unknown>,
        "model",
        loaderDiagnostics,
    );
    const conceptEntries = parseEntries(
        rawConceptEntries,
        (d) => conceptFrontmatterSchema.parse(d) as Record<string, unknown>,
        "concept",
        loaderDiagnostics,
    );
    const narrativeEntries = parseEntries(
        rawNarrativeEntries,
        (d) => narrativeFrontmatterSchema.parse(d) as Record<string, unknown>,
        "narrative",
        loaderDiagnostics,
    );

    // Filter based on INCLUDE_DRAFTS — determines which pages are validated
    const algoFiltered = includeDrafts ? algoEntries : algoEntries.filter((e) => !e.isDraft);
    const modelFiltered = includeDrafts ? modelEntries : modelEntries.filter((e) => !e.isDraft);
    const conceptFiltered = includeDrafts ? conceptEntries : conceptEntries.filter((e) => !e.isDraft);
    const narrativeFiltered = includeDrafts ? narrativeEntries : narrativeEntries.filter((e) => !e.isDraft);

    // ── Build slug namespace ─────────────────────────────────────────────────
    // The FULL slug namespace (drafts included) is used for slug resolution.
    // A non-draft page may legitimately reference a draft page (it just won't be published yet).
    const allEntries = [...algoEntries, ...modelEntries, ...conceptEntries];

    const allGraphEntries: ContentEntry[] = allEntries.map((e) =>
        entryToContentEntry(
            e,
            (algoEntries.includes(e) ? "algorithm" :
                modelEntries.includes(e) ? "model" : "concept") as ContentEntry["type"],
        ),
    );

    // Build full-namespace graph for slug resolution.
    const fullGraph = buildContentGraph(allGraphEntries);
    const knownSlugs = new Set(Object.keys(fullGraph.nodes));

    // Build the published-only graph entries for cycle detection (uses filtered set).
    const filteredGraphEntries: ContentEntry[] = [
        ...algoFiltered.map((e) => entryToContentEntry(e, "algorithm")),
        ...modelFiltered.map((e) => entryToContentEntry(e, "model")),
        ...conceptFiltered.map((e) => entryToContentEntry(e, "concept")),
    ];

    // Use pre-built published graph if supplied, otherwise build from filtered entries.
    const graph = input.publishedGraph ?? buildContentGraph(filteredGraphEntries);

    const paperYears = papersIndexYears(input.indexEntries);

    // ── Atlas lookup (for the narratives rule) ─────────────────────────────
    const atlasBySlug = new Map<string, AtlasLookup>();
    for (const e of allEntries) {
        atlasBySlug.set(e.slug, {
            isDraft: e.isDraft,
            year: yearOfPrimary(e.frontmatter, paperYears),
            relations: (e.frontmatter.relations as TypedRelation[] | undefined) ?? [],
        });
    }

    // ── content/tags.yaml ↔ tagValues drift check input ────────────────────
    let tagsYamlSlugs: Set<string> | null = null;
    if (input.tagsYamlText !== null) {
        const parsed = parseYaml(input.tagsYamlText) as { tags: Array<{ slug: string }> } | null;
        if (parsed?.tags) {
            tagsYamlSlugs = new Set(parsed.tags.map((t) => t.slug));
        }
    }

    return {
        includeDrafts,
        algoEntries,
        modelEntries,
        conceptEntries,
        narrativeEntries,
        algoFiltered,
        modelFiltered,
        conceptFiltered,
        narrativeFiltered,
        allEntries,
        allGraphEntries,
        knownSlugs,
        fullGraph,
        graph,
        sourceIndex,
        paperYears,
        atlasBySlug,
        tagsYamlSlugs,
        loaderDiagnostics,
    };
}

// ── Disk loader ──────────────────────────────────────────────────────────────

export function buildValidationContext(options: ValidateContentOptions = {}): ValidationContext {
    const includeDrafts = options.includeDrafts ?? (process.env.INCLUDE_DRAFTS === "true");

    const algorithms = loadMarkdownDir(join(CONTENT_DIR, "algorithms"), algoSlug);
    const models = loadMarkdownDir(join(CONTENT_DIR, "models"), modelSlug);
    const concepts = loadMarkdownDir(join(CONTENT_DIR, "concepts"), conceptSlug);
    const narratives = loadMarkdownDir(join(CONTENT_DIR, "narratives"), narrativeSlug);

    const indexEntries = loadIndexEntries(PAPERS_INDEX_PATH, { onMissing: () => [] });

    const tagsYamlPath = join(CONTENT_DIR, "tags.yaml");
    const tagsYamlText = existsSync(tagsYamlPath) ? readFileSync(tagsYamlPath, "utf-8") : null;

    return buildContextCore({
        algorithms,
        models,
        concepts,
        narratives,
        indexEntries,
        tagsYamlText,
        includeDrafts,
        publishedGraph: options.publishedGraph,
    });
}

// ── In-memory builder (tests) ────────────────────────────────────────────────

/** Input for the in-memory test context builder. Entries are the same
 *  `{file, slug, data, content}` shape `loadMarkdownDir` produces — build
 *  them directly rather than round-tripping through gray-matter. */
export interface CreateContextInput {
    algorithms?: MarkdownDirEntry[];
    models?: MarkdownDirEntry[];
    concepts?: MarkdownDirEntry[];
    narratives?: MarkdownDirEntry[];
    indexEntries?: RawIndexEntry[];
    /** Raw content/tags.yaml text; omit or pass `null` to simulate an absent file. */
    tagsYaml?: string | null;
    includeDrafts?: boolean;
    publishedGraph?: ContentGraph;
}

/** Builds a `ValidationContext` from in-memory fixtures, for rule unit tests.
 *  Runs the exact same core logic as `buildValidationContext` — only the
 *  loading step (disk reads) differs. */
export function createContext(input: CreateContextInput = {}): ValidationContext {
    return buildContextCore({
        algorithms: input.algorithms ?? [],
        models: input.models ?? [],
        concepts: input.concepts ?? [],
        narratives: input.narratives ?? [],
        indexEntries: input.indexEntries ?? [],
        tagsYamlText: input.tagsYaml ?? null,
        includeDrafts: input.includeDrafts ?? false,
        publishedGraph: input.publishedGraph,
    });
}
