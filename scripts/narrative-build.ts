/**
 * Narrative build helpers.
 *
 * Narratives (content/narratives/<slug>.md) are long-form essays whose
 * frontmatter carries a small graph: nodes referencing either an atlas page
 * or a bare registered paper ("page debt"), typed edges, hand-authored
 * "lenses" (alternate 2D layouts), and "steps" (a guided walkthrough
 * anchored to body `##` headings).
 *
 * This module holds the pure, testable pieces of narrative resolution
 * (timeline-lens generation, preview normalization, chapter slicing,
 * chronology checks) plus the fs-writing emit functions used by
 * scripts/content-build.ts. It intentionally does no YAML/markdown
 * parsing of its own — content-build.ts and validate-content.ts each do
 * their own loading and hand this module already-parsed data.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
    NarrativeFrontmatter,
    NarrativeGraphEdge,
    NarrativeLens,
    NarrativeNode,
    NarrativePageNode,
    NarrativePaperNode,
    ResolvedNarrative,
    NarrativeEntry,
    NarrativeIndexEntry,
} from "../src/lib/content/schema.ts";

// ── Lookups (already-loaded data, passed in by the caller) ────────────────────

/** Minimal atlas-page facts needed to resolve a narrative `page` node. */
export interface AtlasPageLookup {
    slug: string;
    title: string;
    pageKind: "algorithm" | "model" | "concept";
    year?: number;
    quality?: string;
}

/** Minimal paper facts needed to resolve a narrative `paper` node. */
export interface PaperLookup {
    id: string;
    title: string;
    authors: string[];
    year: number;
    url: string;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Format a paper's author list for compact display:
 *   1 author  → "Harris"
 *   2 authors → "Harris & Stephens"
 *   3+        → "Harris et al."
 */
export function formatAuthorsShort(authors: string[]): string {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
}

/** Resolve one authored narrative node into its build-time NarrativeNode shape. */
export function resolveNode(
    node: NarrativeFrontmatter["nodes"][number],
    atlasBySlug: Map<string, AtlasPageLookup>,
    papersById: Map<string, PaperLookup>,
): NarrativeNode {
    if (node.page !== undefined) {
        const page = atlasBySlug.get(node.page);
        const out: NarrativePageNode = {
            id: node.id,
            kind: "page",
            slug: node.page,
            title: page?.title ?? node.page,
            pageKind: page?.pageKind ?? "concept",
            path: `/atlas/${node.page}`,
            area: node.area,
        };
        if (page?.year !== undefined) out.year = page.year;
        if (page?.quality !== undefined) out.quality = page.quality;
        if (node.role !== undefined) out.role = node.role;
        if (node.takeaway !== undefined) out.takeaway = node.takeaway;
        if (node.remark !== undefined) out.remark = node.remark;
        return out;
    }

    // node.paper is guaranteed by the zod XOR refine (belt-and-braces checked
    // again in validate-content.ts).
    const paperId = node.paper as string;
    const paper = papersById.get(paperId);
    const out: NarrativePaperNode = {
        id: node.id,
        kind: "paper",
        paperId,
        // "label as the display title" — falls back defensively so a build
        // that races ahead of validation never crashes on a missing label.
        title: node.label ?? paper?.title ?? paperId,
        authorsShort: paper ? formatAuthorsShort(paper.authors) : "",
        year: paper?.year ?? 0,
        url: paper?.url ?? "",
        debt: true,
        area: node.area,
    };
    if (node.role !== undefined) out.role = node.role;
    if (node.takeaway !== undefined) out.takeaway = node.takeaway;
    if (node.remark !== undefined) out.remark = node.remark;
    return out;
}

/** Input shape for timeline-lens generation — a subset of a resolved NarrativeNode. */
export interface TimelineNodeInput {
    id: string;
    /** Derived publication year. Nodes without one are omitted from the timeline. */
    year?: number;
    area: string;
}

/** Widest year range rendered at one grid column per year; wider ranges compress linearly. */
const TIMELINE_MAX_COLUMNS = 14;

/**
 * Generate the build-only "timeline" lens in the renderer's grid units
 * (1.0 = one chip pitch): x is linear in the derived year — one column per
 * year, compressed once the range exceeds TIMELINE_MAX_COLUMNS — and y is the
 * index of the node's area in `areaOrder` (its lane). Nodes with no derivable
 * year are omitted.
 */
export function buildTimelineLens(nodes: TimelineNodeInput[], areaOrder: string[]): NarrativeLens {
    const withYear = nodes.filter(
        (n): n is TimelineNodeInput & { year: number } => typeof n.year === "number",
    );
    const coords: Record<string, [number, number]> = {};
    if (withYear.length > 0) {
        const years = withYear.map((n) => n.year);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const span = maxYear - minYear;
        const unitsPerYear = span > TIMELINE_MAX_COLUMNS ? TIMELINE_MAX_COLUMNS / span : 1;
        for (const n of withYear) {
            const x = (n.year - minYear) * unitsPerYear;
            const laneIndex = areaOrder.indexOf(n.area);
            coords[n.id] = [x, laneIndex >= 0 ? laneIndex : 0];
        }
    }
    return { id: "timeline", title: "Timeline", coords };
}

/**
 * Normalize a coordinate map to fit the unit square [0,1]x[0,1] via
 * independent min-max scaling per axis. Used to derive the card-thumbnail
 * `preview` from a hand-authored lens's arbitrary coordinate range.
 */
export function normalizeCoordsToUnitSquare(
    coords: Record<string, [number, number]>,
): Record<string, [number, number]> {
    const entries = Object.entries(coords);
    if (entries.length === 0) return {};
    const xs = entries.map(([, [x]]) => x);
    const ys = entries.map(([, [, y]]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const out: Record<string, [number, number]> = {};
    for (const [id, [x, y]] of entries) {
        const nx = spanX === 0 ? 0.5 : (x - minX) / spanX;
        const ny = spanY === 0 ? 0.5 : (y - minY) / spanY;
        out[id] = [nx, ny];
    }
    return out;
}

/**
 * Slice rendered narrative HTML into per-`##`-chapter fragments, keyed by
 * the rehype-slug heading id. Each chapter runs from its `<h2 id="...">`
 * heading (inclusive) up to the next `<h2>` (exclusive), or end of document.
 *
 * Pure string processing over already-rendered HTML — relies on the exact
 * same rehype-slug pass that produced `html` so ids match `steps[].anchor`
 * one-for-one. Works for HTML from any renderer that ran rehype-slug on h2
 * elements, which is why validate-content.ts's lighter renderer can reuse it
 * for anchor-existence checks without duplicating slicing logic.
 */
export function sliceChapters(html: string): Record<string, string> {
    const headingRe = /<h2\b[^>]*\bid="([^"]+)"[^>]*>/g;
    const matches: { id: string; start: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(html)) !== null) {
        matches.push({ id: m[1], start: m.index });
    }
    const chapters: Record<string, string> = {};
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].start;
        const end = i + 1 < matches.length ? matches[i + 1].start : html.length;
        chapters[matches[i].id] = html.slice(start, end);
    }
    return chapters;
}

/**
 * Chronology check for `evolution` edges: true when `from` predates `to`
 * incorrectly, i.e. `from`'s derived year is strictly greater than `to`'s.
 * Returns false (no violation) whenever either year is underivable — the
 * caller is expected to have already warned about the missing year
 * separately (see validate-content.ts's "node with no derivable year" rule).
 */
export function violatesEvolutionChronology(
    fromYear: number | undefined,
    toYear: number | undefined,
): boolean {
    if (fromYear === undefined || toYear === undefined) return false;
    return fromYear > toYear;
}

/** Input shape for lens x-order inversion detection. */
export interface LensInversionCheckNode {
    id: string;
    x: number;
    year?: number;
}

/**
 * Find node-id pairs in a hand-authored lens whose x-order contradicts
 * their publication-year order by at least `minGapYears` (default 2) —
 * "x preserves loose publication order; same/adjacent years may reorder
 * freely" per CLAUDE.md's narrative authoring policy.
 */
export function findLensOrderInversions(
    nodes: LensInversionCheckNode[],
    minGapYears = 2,
): Array<[string, string]> {
    const withYear = nodes.filter(
        (n): n is LensInversionCheckNode & { year: number } => typeof n.year === "number",
    );
    const inversions: Array<[string, string]> = [];
    for (let i = 0; i < withYear.length; i++) {
        for (let j = i + 1; j < withYear.length; j++) {
            const a = withYear[i];
            const b = withYear[j];
            if (Math.abs(a.year - b.year) < minGapYears) continue;
            const yearOrderAFirst = a.year < b.year;
            const xOrderAFirst = a.x < b.x;
            if (yearOrderAFirst !== xOrderAFirst) {
                inversions.push([a.id, b.id]);
            }
        }
    }
    return inversions;
}

// ── Resolution (build-time graph assembly) ─────────────────────────────────

/**
 * Resolve an authored narrative frontmatter object into the build-time
 * ResolvedNarrative graph: page/paper nodes resolved against the atlas and
 * papers lookups, authored edges passed through, and the authored lenses
 * plus the generated `timeline` lens.
 */
export function resolveNarrative(
    fm: Pick<NarrativeFrontmatter, "areas" | "nodes" | "edges" | "lenses">,
    atlasBySlug: Map<string, AtlasPageLookup>,
    papersById: Map<string, PaperLookup>,
): ResolvedNarrative {
    const areas = fm.areas.map((a) => ({ id: a.id, label: a.label }));
    const areaOrder = areas.map((a) => a.id);

    const nodes: NarrativeNode[] = fm.nodes.map((n) => resolveNode(n, atlasBySlug, papersById));

    const edges: NarrativeGraphEdge[] = (fm.edges ?? []).map((e) => ({
        from: e.from,
        to: e.to,
        type: e.type,
        ...(e.label !== undefined ? { label: e.label } : {}),
    }));

    const authoredLenses: NarrativeLens[] = (fm.lenses ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        coords: { ...l.coords },
    }));

    const timelineInput: TimelineNodeInput[] = nodes.map((n) => ({
        id: n.id,
        year: n.kind === "page" ? n.year : n.year > 0 ? n.year : undefined,
        area: n.area,
    }));
    const timelineLens = buildTimelineLens(timelineInput, areaOrder);

    return { areas, nodes, edges, lenses: [...authoredLenses, timelineLens] };
}

/** Build the slim NarrativeIndexEntry (card/listing data) for one resolved narrative. */
export function buildNarrativeIndexEntry(
    slug: string,
    fm: { title: string; summary: string; tagline?: string; date: string; draft?: boolean },
    resolved: ResolvedNarrative,
    stepsCount: number,
): NarrativeIndexEntry {
    const overview = resolved.lenses.find((l) => l.id === "overview");
    const preview = overview ? normalizeCoordsToUnitSquare(overview.coords) : {};
    const debt = resolved.nodes.filter((n) => n.kind === "paper").length;
    return {
        slug,
        title: fm.title,
        summary: fm.summary,
        ...(fm.tagline !== undefined ? { tagline: fm.tagline } : {}),
        date: fm.date,
        ...(fm.draft === true ? { draft: true } : {}),
        stats: { nodes: resolved.nodes.length, steps: stepsCount, debt },
        areas: resolved.areas,
        preview,
    };
}

/**
 * Reverse index: which narratives reference a given atlas (algorithm/model/
 * concept) page, keyed by atlas slug. A narrative referencing the same
 * atlas page from multiple nodes contributes exactly one entry.
 */
export function buildNarrativeRefs(
    entries: Array<{ slug: string; title: string; narrative: ResolvedNarrative }>,
): Record<string, { slug: string; title: string }[]> {
    const refs: Record<string, { slug: string; title: string }[]> = {};
    for (const entry of entries) {
        const seenSlugs = new Set<string>();
        for (const node of entry.narrative.nodes) {
            if (node.kind !== "page") continue;
            if (seenSlugs.has(node.slug)) continue;
            seenSlugs.add(node.slug);
            if (!refs[node.slug]) refs[node.slug] = [];
            refs[node.slug].push({ slug: entry.slug, title: entry.title });
        }
    }
    for (const key of Object.keys(refs)) {
        refs[key].sort((a, b) => a.slug.localeCompare(b.slug));
    }
    return refs;
}

// ── Emit (fs writers) ───────────────────────────────────────────────────────

function renderNarrativeModuleSource(entry: Pick<NarrativeEntry, "html" | "chapters" | "narrative" | "frontmatter">): string {
    return [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        'import type { NarrativeFrontmatter, ResolvedNarrative } from "../../../lib/content/schema.ts";',
        "",
        `export const html = ${JSON.stringify(entry.html)};`,
        "",
        `export const chapters: Record<string, string> = ${JSON.stringify(entry.chapters, null, 2)};`,
        "",
        `export const narrative: ResolvedNarrative = ${JSON.stringify(entry.narrative, null, 2)};`,
        "",
        // The guided walkthrough is authored in frontmatter and is not part of the
        // ResolvedNarrative graph — the reader UI needs it, so it ships alongside.
        `export const steps: NarrativeFrontmatter["steps"] = ${JSON.stringify(entry.frontmatter.steps, null, 2)};`,
        "",
    ].join("\n");
}

/** Write one per-slug narrative module to `<dir>/<slug>.ts`. */
export function emitNarrativeModule(
    entry: Pick<NarrativeEntry, "slug" | "html" | "chapters" | "narrative" | "frontmatter">,
    dir: string,
): void {
    const file = join(dir, `${entry.slug}.ts`);
    writeFileSync(file, renderNarrativeModuleSource(entry), "utf-8");
}

/** Write src/generated/narrative-loaders.ts (mirrors algorithm-loaders.ts style). */
export function emitNarrativeLoaders(entries: Array<{ slug: string }>, outDir: string): void {
    const lines = [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        'import type { NarrativeFrontmatter, ResolvedNarrative } from "../lib/content/schema.ts";',
        "",
        "export interface GeneratedNarrativeModule {",
        "  html: string;",
        "  chapters: Record<string, string>;",
        "  narrative: ResolvedNarrative;",
        '  steps: NarrativeFrontmatter["steps"];',
        "}",
        "",
        "export const narrativeLoaders: Record<string, () => Promise<GeneratedNarrativeModule>> = {",
        ...entries.map(
            (e) => `  ${JSON.stringify(e.slug)}: () => import(${JSON.stringify(`./content/narratives/${e.slug}.ts`)}),`,
        ),
        "};",
        "",
    ];
    writeFileSync(join(outDir, "narrative-loaders.ts"), lines.join("\n"), "utf-8");
}

/** Write src/generated/narrative-refs.ts — the atlas-slug → narratives reverse index. */
export function emitNarrativeRefs(
    refs: Record<string, { slug: string; title: string }[]>,
    outDir: string,
): void {
    const lines = [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        "// Reverse index: which narratives reference a given atlas (algorithm/model/concept) page.",
        "",
        `export const narrativeRefs: Record<string, { slug: string; title: string }[]> = ${JSON.stringify(refs, null, 2)};`,
        "",
    ];
    writeFileSync(join(outDir, "narrative-refs.ts"), lines.join("\n"), "utf-8");
}
