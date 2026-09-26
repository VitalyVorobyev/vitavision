/**
 * Shared types for the content validator (scripts/validate/**).
 *
 * `ValidationContext` is the read-only bag every rule module consumes —
 * built once by `buildValidationContext` (or, for tests, `createContext`)
 * in ./context.ts. Rules never touch disk; they only read from the context
 * and return `Diagnostic[]`.
 */
import type { ContentGraph, ContentEntry } from "../content-graph.ts";
import type { RawIndexEntry } from "../lib/papers-index.ts";
import type { MarkdownDirEntry } from "../lib/content-kinds.ts";
import type { AuthorRecord } from "../lib/authors.ts";

export type IndexEntry = RawIndexEntry;

/** One validator finding. `message` is the exact string the CLI prints,
 *  including its leading `[file]`-shaped prefix where applicable. */
export interface Diagnostic {
    level: "error" | "warning";
    message: string;
}

/**
 * Shape of one `relations[]` entry, as authored in frontmatter. Kept as a
 * loosely-typed local shape (matching the original validate-content.ts)
 * rather than importing content-graph.ts's stricter `TypedRelation`, since
 * the validator must tolerate not-yet-schema-valid data while reporting on it.
 */
export type TypedRelation = {
    type: string;
    target: string;
    confidence: string;
    caution?: string;
};

/** A loaded + zod-parsed content page, tagged with its effective draft status
 *  (`draft: true` or `dev: true` in frontmatter). */
export interface ParsedEntry extends MarkdownDirEntry {
    frontmatter: Record<string, unknown>;
    isDraft: boolean;
}

/** Per-slug lookup used by the narratives rule to resolve `page` nodes and to
 *  cross-check narrative edges against each page's authored Atlas relations. */
export interface AtlasLookup {
    isDraft: boolean;
    year?: number;
    relations: TypedRelation[];
}

/** Content kinds carrying a markdown body — the set `rules/images.ts`,
 *  `rules/links.ts`, and `rules/cross-refs.ts` scan uniformly. */
export type BodyEntryKind = "algorithm" | "model" | "concept" | "narrative" | "blog" | "demo";

/**
 * One page's body + raw frontmatter data, normalized across every content
 * kind so images/links/cross-refs rules don't special-case algo/model/concept
 * (which carry zod-parsed `frontmatter`) vs blog/demo (kept raw — see
 * `ValidationContext.blogEntries`/`demoEntries`). `data` is whichever of the
 * two a kind has; both shapes key relationship fields (`relatedPosts`, ...)
 * identically, untouched by zod transforms.
 */
export interface BodyEntry {
    kind: BodyEntryKind;
    file: string;
    slug: string;
    content: string;
    data: Record<string, unknown>;
    /** `draft: true` or `dev: true` in raw frontmatter, independent of includeDrafts filtering. */
    isDraft: boolean;
}

export interface ValidationContext {
    includeDrafts: boolean;

    /** Loaded + zod-parsed entries, UNFILTERED (drafts included). */
    algoEntries: ParsedEntry[];
    modelEntries: ParsedEntry[];
    conceptEntries: ParsedEntry[];
    narrativeEntries: ParsedEntry[];

    /** Draft-filtered per includeDrafts — the set actually validated by most rules. */
    algoFiltered: ParsedEntry[];
    modelFiltered: ParsedEntry[];
    conceptFiltered: ParsedEntry[];
    narrativeFiltered: ParsedEntry[];

    /** algo + model + concept, UNFILTERED — used where a rule must see draft
     *  pages regardless of includeDrafts (e.g. resolving a historical page's
     *  generalized_by target, or canonical's derived-incoming check). */
    allEntries: ParsedEntry[];
    /** `allEntries` projected into content-graph.ts's `ContentEntry` shape. */
    allGraphEntries: ContentEntry[];

    /** Full (draft-inclusive) slug namespace — used for relationship-field resolution. */
    knownSlugs: Set<string>;
    fullGraph: ContentGraph;
    /** Published-only graph (or `options.publishedGraph`, when supplied) — used for cycle detection. */
    graph: ContentGraph;

    sourceIndex: Map<string, IndexEntry>;
    /** Map<paperId, year>, from docs/papers/index.yaml. */
    paperYears: Map<string, number>;
    /** Map<slug, AtlasLookup> over algo+model+concept, UNFILTERED — used by the narratives rule. */
    atlasBySlug: Map<string, AtlasLookup>;
    /** Tag slugs declared in content/tags.yaml, or `null` when the file is
     *  absent or has no `tags` key (both cases skip Rule 8 entirely). */
    tagsYamlSlugs: Set<string> | null;

    /** Raw (gray-matter parsed, NOT zod-validated) blog/demo entries — schema
     *  errors are a rule (`rules/schemas.ts`), not a context-build failure,
     *  so a schema-invalid blog/demo page still gets image/link/cross-ref
     *  checks, matching the old content-validate.ts's behaviour. */
    blogEntries: MarkdownDirEntry[];
    demoEntries: MarkdownDirEntry[];
    blogSlugs: Set<string>;
    demoSlugs: Set<string>;
    /** Narrative slugs, UNFILTERED (drafts included) — links may target a draft narrative. */
    narrativeSlugs: Set<string>;

    /** Every page's body + raw data, across all six content kinds, UNFILTERED
     *  — used by rules/images.ts, rules/links.ts, rules/cross-refs.ts. */
    bodyEntries: BodyEntry[];

    /** True when `content/images/<relPath>` exists on disk (or is present in
     *  a test fixture's injected image list). Kept as a function (backed by
     *  a precomputed Set) so rules stay pure/sync while tests can inject an
     *  arbitrary fixture image list via `createContext({ images: [...] })`. */
    imageExists: (relPath: string) => boolean;

    /** Every author id in docs/papers/authors.yaml (canonical AND merged-away
     *  ids — a merged id's page still exists as a redirect, so both resolve
     *  as valid `/authors/<id>` link targets). */
    authorIds: Set<string>;

    /** Raw docs/papers/authors.yaml rows (id, name, optional orcid/mergedInto)
     *  — used by rules/authors.ts for mergedInto target/cycle checks. */
    authorRecords: AuthorRecord[];

    /** Diagnostics produced while building the context itself — index.yaml
     *  loader errors (reserved-prefix ids, malformed repo/doc entries) and
     *  frontmatter parse errors. These occurred before any rule ran in the
     *  original monolith, so they must be emitted first, in this order. */
    loaderDiagnostics: Diagnostic[];
}

export type Rule = (ctx: ValidationContext) => Diagnostic[] | Promise<Diagnostic[]>;
