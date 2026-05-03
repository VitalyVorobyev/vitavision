/**
 * Content validation script.
 *
 * Validates slug resolution, source-id existence, canonical quality gates,
 * prerequisite cycle detection, and model implementations requirements.
 *
 * Run standalone: bun run scripts/validate-content.ts
 * Also imported by content-build.ts for build-time validation.
 *
 * Exit code 1 on any validation failure.
 * Set INCLUDE_DRAFTS=true to also validate draft pages.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";

import {
    algorithmFrontmatterSchema,
    modelFrontmatterSchema,
    conceptFrontmatterSchema,
} from "../src/lib/content/schema.ts";
import type { ContentGraph } from "./content-graph.ts";
import { buildContentGraph, detectPrerequisiteCycles } from "./content-graph.ts";
import type { ContentEntry } from "./content-graph.ts";
import { computeReadingTimeMinutes } from "./reading-time.ts";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const REPO_ROOT = join(import.meta.dir, "..");
const CONTENT_DIR = join(REPO_ROOT, "content");
const PAPERS_INDEX = join(REPO_ROOT, "docs", "papers", "index.yaml");

// ── Minimal markdown renderer (no Shiki/KaTeX) for TODO scanning ───────────
async function renderMarkdownPlain(content: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(content);
    return String(result);
}

// ── Typed source registry ─────────────────────────────────────────────────────
type SourceKind = "paper" | "repo" | "doc";

interface IndexEntry {
    id: string;
    kind: SourceKind;
    // paper:
    url?: string;
    // repo:
    repo?: string;
    commit?: string;
    license?: string;
    // doc:
    path?: string;
}

/**
 * Build a typed Map keyed by canonical source-ref form:
 *   paper:<id>            for kind=paper (or absent kind)
 *   repo:<repo>@<commit>  for kind=repo
 *   doc:<path>            for kind=doc
 *
 * Also validates defensive rule: no paper id may start with "repo:" or "doc:".
 */
function loadSourceIndex(validatorErrors: string[]): Map<string, IndexEntry> {
    const index = new Map<string, IndexEntry>();
    if (!existsSync(PAPERS_INDEX)) return index;
    const raw = readFileSync(PAPERS_INDEX, "utf-8");
    const entries = parseYaml(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(entries)) return index;

    for (const e of entries) {
        const id = e.id as string | undefined;
        if (!id) continue;
        const kind = (e.kind as SourceKind | undefined) ?? "paper";

        // Defensive rule: paper ids must not start with reserved prefixes.
        if (kind === "paper" && (id.startsWith("repo:") || id.startsWith("doc:"))) {
            validatorErrors.push(
                `[index.yaml] entry id "${id}" must not start with reserved prefix "repo:" or "doc:"`,
            );
            continue;
        }

        const entry: IndexEntry = {
            id,
            kind,
            url: e.url as string | undefined,
            repo: e.repo as string | undefined,
            commit: e.commit as string | undefined,
            license: e.license as string | undefined,
            path: e.path as string | undefined,
        };

        let key: string;
        if (kind === "paper") {
            key = `paper:${id}`;
        } else if (kind === "repo") {
            const repo = e.repo as string | undefined;
            const commit = e.commit as string | undefined;
            if (!repo || !commit) {
                validatorErrors.push(
                    `[index.yaml] entry id "${id}" (kind: repo) must have "repo" and "commit" fields`,
                );
                continue;
            }
            key = `repo:${repo}@${commit}`;
        } else {
            // doc
            const path = e.path as string | undefined;
            if (!path) {
                validatorErrors.push(
                    `[index.yaml] entry id "${id}" (kind: doc) must have a "path" field`,
                );
                continue;
            }
            key = `doc:${path}`;
        }

        index.set(key, entry);
    }
    return index;
}

/** Parse a source-ref string into a { kind, key } pair. */
function parseSourceRef(s: string): { kind: SourceKind; key: string } | null {
    if (s.startsWith("paper:")) {
        return { kind: "paper", key: s };
    }
    if (s.startsWith("repo:")) {
        return { kind: "repo", key: s };
    }
    if (s.startsWith("doc:")) {
        return { kind: "doc", key: s };
    }
    // Bare id → backward-compat paper reference
    return { kind: "paper", key: `paper:${s}` };
}

// ── Slug helpers ─────────────────────────────────────────────────────────────
function algoSlug(filename: string): string {
    return filename.replace(/\.md$/, "");
}
function modelSlug(filename: string): string {
    return filename.replace(/\.md$/, "");
}
function conceptSlug(filename: string): string {
    return filename.replace(/\.md$/, "");
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawEntry {
    slug: string;
    file: string;
    data: Record<string, unknown>;
    content: string;
}

// ── Load all content pages (without full markdown rendering) ──────────────────
function loadDirectory(
    dir: string,
    slugFn: (f: string) => string,
): RawEntry[] {
    if (!existsSync(dir)) return [];
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    return files.map((file) => {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data, content } = matter(raw);
        if (data.readingTimeMinutes === undefined) {
            data.readingTimeMinutes = computeReadingTimeMinutes(content);
        }
        return { slug: slugFn(file), file, data, content };
    });
}

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

/**
 * Validate all content entries.
 * Always loads content from disk.
 * Returns list of error strings (empty = clean).
 */
export async function validateContent(options?: ValidateContentOptions): Promise<string[]> {
    const errors: string[] = [];

    const includeDrafts = options?.includeDrafts ?? (process.env.INCLUDE_DRAFTS === "true");

    // ── Load content ────────────────────────────────────────────────────────
    const rawAlgoEntries = loadDirectory(join(CONTENT_DIR, "algorithms"), algoSlug);
    const rawModelEntries = loadDirectory(join(CONTENT_DIR, "models"), modelSlug);
    const rawConceptEntries = loadDirectory(join(CONTENT_DIR, "concepts"), conceptSlug);

    const sourceIndex = loadSourceIndex(errors);

    // ── Parse and filter ─────────────────────────────────────────────────────
    interface ParsedEntry extends RawEntry {
        frontmatter: Record<string, unknown>;
        isDraft: boolean;
    }

    function parseEntries(
        rawEntries: RawEntry[],
        schemaFn: (data: Record<string, unknown>) => Record<string, unknown>,
        label: string,
    ): ParsedEntry[] {
        const out: ParsedEntry[] = [];
        for (const e of rawEntries) {
            try {
                const parsed = schemaFn(e.data);
                const isDraft = !!(e.data.draft);
                out.push({ ...e, frontmatter: parsed, isDraft });
            } catch (err) {
                errors.push(`[${e.file}] ${label} frontmatter parse error: ${String(err)}`);
            }
        }
        return out;
    }

    const algoEntries = parseEntries(
        rawAlgoEntries,
        (d) => algorithmFrontmatterSchema.parse(d) as Record<string, unknown>,
        "algorithm",
    );
    const modelEntries = parseEntries(
        rawModelEntries,
        (d) => modelFrontmatterSchema.parse(d) as Record<string, unknown>,
        "model",
    );
    const conceptEntries = parseEntries(
        rawConceptEntries,
        (d) => conceptFrontmatterSchema.parse(d) as Record<string, unknown>,
        "concept",
    );

    // Filter based on INCLUDE_DRAFTS — determines which pages are validated
    const algoFiltered = includeDrafts ? algoEntries : algoEntries.filter((e) => !e.isDraft);
    const modelFiltered = includeDrafts ? modelEntries : modelEntries.filter((e) => !e.isDraft);
    const conceptFiltered = includeDrafts ? conceptEntries : conceptEntries.filter((e) => !e.isDraft);

    const totalChecked = algoFiltered.length + modelFiltered.length + conceptFiltered.length;

    // ── Build slug namespace ─────────────────────────────────────────────────
    // The FULL slug namespace (drafts included) is used for slug resolution.
    // A non-draft page may legitimately reference a draft page (it just won't be published yet).
    // This matches how the old content-validate.ts worked.
    const allEntries = [...algoEntries, ...modelEntries, ...conceptEntries];
    const allGraphEntries: ContentEntry[] = allEntries.map((e) => ({
        slug: e.slug,
        type: (algoEntries.includes(e) ? "algorithm" :
            modelEntries.includes(e) ? "model" : "concept") as ContentEntry["type"],
        title: (e.frontmatter.title as string) ?? e.slug,
        summary: (e.frontmatter.summary as string) ?? "",
        relatedAlgorithms: e.frontmatter.relatedAlgorithms as string[] | undefined,
        prerequisites: e.frontmatter.prerequisites as string[] | undefined,
        related: e.frontmatter.related as string[] | undefined,
        comparedWith: e.frontmatter.comparedWith as string[] | undefined,
        failureModes: e.frontmatter.failureModes as string[] | undefined,
    }));

    // Build full-namespace graph for slug resolution.
    const fullGraph = buildContentGraph(allGraphEntries);
    const knownSlugs = new Set(Object.keys(fullGraph.nodes));

    // Build the published-only graph entries for cycle detection (uses filtered set).
    const filteredGraphEntries: ContentEntry[] = [
        ...algoFiltered.map((e) => ({
            slug: e.slug,
            type: "algorithm" as const,
            title: (e.frontmatter.title as string) ?? e.slug,
            summary: (e.frontmatter.summary as string) ?? "",
            relatedAlgorithms: e.frontmatter.relatedAlgorithms as string[] | undefined,
            prerequisites: e.frontmatter.prerequisites as string[] | undefined,
            related: e.frontmatter.related as string[] | undefined,
            comparedWith: e.frontmatter.comparedWith as string[] | undefined,
            failureModes: e.frontmatter.failureModes as string[] | undefined,
        })),
        ...modelFiltered.map((e) => ({
            slug: e.slug,
            type: "model" as const,
            title: (e.frontmatter.title as string) ?? e.slug,
            summary: (e.frontmatter.summary as string) ?? "",
            relatedAlgorithms: e.frontmatter.relatedAlgorithms as string[] | undefined,
            prerequisites: e.frontmatter.prerequisites as string[] | undefined,
            related: e.frontmatter.related as string[] | undefined,
            comparedWith: e.frontmatter.comparedWith as string[] | undefined,
            failureModes: e.frontmatter.failureModes as string[] | undefined,
        })),
        ...conceptFiltered.map((e) => ({
            slug: e.slug,
            type: "concept" as const,
            title: (e.frontmatter.title as string) ?? e.slug,
            summary: (e.frontmatter.summary as string) ?? "",
            prerequisites: e.frontmatter.prerequisites as string[] | undefined,
            related: e.frontmatter.related as string[] | undefined,
            comparedWith: e.frontmatter.comparedWith as string[] | undefined,
            failureModes: e.frontmatter.failureModes as string[] | undefined,
        })),
    ];

    // Use pre-built published graph if supplied, otherwise build from filtered entries.
    const graph = options?.publishedGraph ?? buildContentGraph(filteredGraphEntries);

    // ── Rule 1: Slug resolution ──────────────────────────────────────────────
    function checkRelationshipField(
        file: string,
        fieldName: string,
        slugs: string[] | undefined,
    ): void {
        if (!slugs || slugs.length === 0) return;
        for (const slug of slugs) {
            if (!knownSlugs.has(slug)) {
                errors.push(`[${file}] unknown slug "${slug}" in ${fieldName}`);
            }
        }
    }

    for (const e of [...algoFiltered, ...modelFiltered, ...conceptFiltered]) {
        checkRelationshipField(e.file, "prerequisites", e.frontmatter.prerequisites as string[] | undefined);
        checkRelationshipField(e.file, "related", e.frontmatter.related as string[] | undefined);
        checkRelationshipField(e.file, "comparedWith", e.frontmatter.comparedWith as string[] | undefined);
        checkRelationshipField(e.file, "failureModes", e.frontmatter.failureModes as string[] | undefined);
        checkRelationshipField(e.file, "relatedAlgorithms", e.frontmatter.relatedAlgorithms as string[] | undefined);
    }

    // ── Rule 2: Prerequisite cycles ───────────────────────────────────────────
    const cycles = detectPrerequisiteCycles(graph);
    for (const cycle of cycles) {
        errors.push(`[prerequisite cycle] ${cycle.join(" → ")}`);
    }

    // ── Rule 3: Source-id existence ───────────────────────────────────────────
    const REPO_REF_RE = /^repo:https?:\/\/[^@]+@[0-9a-f]{7,40}$/;

    function checkSingleSourceRef(file: string, field: string, value: string): void {
        const parsed = parseSourceRef(value);
        if (!parsed) {
            errors.push(
                `[${file}] ${field} "${value}" malformed (expected paper:<id> | repo:<url>@<7-40 hex> | doc:<path>)`,
            );
            return;
        }

        const { kind, key } = parsed;

        if (kind === "paper") {
            if (!sourceIndex.has(key)) {
                errors.push(`[${file}] ${field} "${value}" not found in docs/papers/index.yaml`);
            }
        } else if (kind === "repo") {
            if (!REPO_REF_RE.test(value)) {
                errors.push(
                    `[${file}] ${field} "${value}" malformed (expected paper:<id> | repo:<url>@<7-40 hex> | doc:<path>)`,
                );
                return;
            }
            if (!sourceIndex.has(key)) {
                errors.push(`[${file}] ${field} "${value}" not found in docs/papers/index.yaml`);
            }
        } else {
            // doc
            const docPath = value.slice("doc:".length);
            const absPath = join(REPO_ROOT, docPath);
            if (!existsSync(absPath)) {
                errors.push(`[${file}] ${field} "${value}" file does not exist`);
            }
        }
    }

    function checkSourceIds(file: string, sources: unknown): void {
        if (!sources || typeof sources !== "object") return;
        const src = sources as { primary?: string; references?: string[] };
        if (src.primary) {
            checkSingleSourceRef(file, "sources.primary", src.primary);
        }
        for (const ref of src.references ?? []) {
            checkSingleSourceRef(file, "sources.references", ref);
        }
    }

    for (const e of [...algoFiltered, ...modelFiltered]) {
        checkSourceIds(e.file, e.frontmatter.sources);
    }
    // Concept pages: sources optional, skip validation if absent.
    for (const e of conceptFiltered) {
        const sources = e.frontmatter.sources as { primary?: string; references?: string[] } | undefined;
        if (sources?.primary || (sources?.references && sources.references.length > 0)) {
            checkSourceIds(e.file, sources);
        }
    }

    // ── Rule 4: Canonical quality gates ──────────────────────────────────────
    for (const e of [...algoFiltered, ...modelFiltered, ...conceptFiltered]) {
        if (e.frontmatter.quality !== "canonical") continue;

        // Must not be draft
        if (e.isDraft) {
            errors.push(`[${e.file}] quality: "canonical" but page is draft`);
        }

        // Must have non-empty title + summary
        const title = e.frontmatter.title as string | undefined;
        const summary = e.frontmatter.summary as string | undefined;
        if (!title || title.trim().length === 0) {
            errors.push(`[${e.file}] quality: "canonical" but title is empty`);
        }
        if (!summary || summary.trim().length === 0) {
            errors.push(`[${e.file}] quality: "canonical" but summary is empty`);
        }

        // Algorithm/model must have sources.primary
        const isAlgoOrModel = algoFiltered.some((a) => a.slug === e.slug) ||
            modelFiltered.some((m) => m.slug === e.slug);
        if (isAlgoOrModel) {
            const src = e.frontmatter.sources as { primary?: string } | undefined;
            if (!src?.primary) {
                errors.push(`[${e.file}] quality: "canonical" algorithm/model must have sources.primary`);
            }
        }

        // Must have at least one of prerequisites / related / relatedAlgorithms
        const prereqs = e.frontmatter.prerequisites as string[] | undefined;
        const related = e.frontmatter.related as string[] | undefined;
        const relAlgo = e.frontmatter.relatedAlgorithms as string[] | undefined;
        const hasRelationship =
            (prereqs && prereqs.length > 0) ||
            (related && related.length > 0) ||
            (relAlgo && relAlgo.length > 0);
        if (!hasRelationship) {
            errors.push(
                `[${e.file}] quality: "canonical" requires at least one of prerequisites/related/relatedAlgorithms`,
            );
        }

        // Rendered HTML must not contain TODO (case-insensitive)
        const html = await renderMarkdownPlain(e.content);
        if (/TODO/i.test(html)) {
            errors.push(`[${e.file}] quality: "canonical" but rendered HTML contains TODO`);
        }
    }

    // ── Rule 5: Non-draft model pages must have implementations[] ─────────────
    for (const e of modelFiltered) {
        if (e.isDraft) continue;
        if (e.frontmatter.noPublicImpl === true) continue;
        const impls = e.frontmatter.implementations as unknown[] | undefined;
        if (!impls || impls.length === 0) {
            errors.push(
                `[${e.file}] model page is not draft but has no implementations[] entry (and noPublicImpl is not set)`,
            );
        }
    }

    // ── Rule 6: noPublicImpl: true requires a non-empty ## Limitations section ─
    for (const e of modelFiltered) {
        if (e.frontmatter.noPublicImpl !== true) continue;
        const lines = e.content.split("\n");
        let inLimitations = false;
        let hasLimitationsHeading = false;
        let hasLimitationsBody = false;
        for (const line of lines) {
            if (line.startsWith("## Limitations")) {
                inLimitations = true;
                hasLimitationsHeading = true;
                continue;
            }
            if (inLimitations) {
                if (line.startsWith("## ")) {
                    break;
                }
                if (line.trim() !== "" && !line.startsWith("#")) {
                    hasLimitationsBody = true;
                    break;
                }
            }
        }
        if (!hasLimitationsHeading) {
            errors.push(
                `[${e.file}] noPublicImpl: true requires a ## Limitations section`,
            );
        } else if (!hasLimitationsBody) {
            errors.push(
                `[${e.file}] noPublicImpl: true requires a non-empty ## Limitations section`,
            );
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    if (errors.length === 0) {
        console.log(
            `content:validate — ${totalChecked} page(s) validated (${algoFiltered.length} algo, ${modelFiltered.length} model, ${conceptFiltered.length} concept), no errors`,
        );
    }

    return errors;
}

// ── Standalone entry point ────────────────────────────────────────────────────
if (import.meta.main) {
    const includeDrafts = process.env.INCLUDE_DRAFTS === "true";
    console.log(`content:validate — checking content (includeDrafts=${includeDrafts})...\n`);

    validateContent().then((errors) => {
        if (errors.length > 0) {
            for (const err of errors) {
                console.error(`  ERROR ${err}`);
            }
            console.error(`\ncontent:validate — ${errors.length} error(s) found`);
            process.exit(1);
        }
    }).catch((err) => {
        console.error("content:validate failed:", err);
        process.exit(1);
    });
}
