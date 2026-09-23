/**
 * Scholarly-index build: derives `public/scholarly-index.json` +
 * `src/generated/scholarly-index.ts` for content:build.
 *
 * `buildScholarlyIndex` is a pure function over already-loaded inputs (published
 * atlas pages, the registry paper list with `cites`, the authors index, and
 * published narratives projected to their page/paper node ids) — it does no
 * file I/O and never re-reads docs/papers/index.yaml itself. `layoutNetwork` is
 * split out because it is the one non-trivial piece of "derivation": it runs a
 * deterministic d3-force simulation over the co-author graph so the People
 * network has stable, reproducible positions across builds. `emitScholarlyIndex`
 * is the only function here that touches disk.
 *
 * See src/lib/atlas/scholarlyTypes.ts for the output shape (the spec this file
 * implements) and src/lib/atlas/scholarlyGroups.ts for the domain → community
 * mapping used to color/anchor the network.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
} from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import type {
    ScholarlyAuthor,
    ScholarlyGroup,
    ScholarlyIndex,
    ScholarlyNarrativeRef,
    ScholarlyNetworkNode,
    ScholarlyPageMeta,
    ScholarlyPaper,
} from "../../src/lib/atlas/scholarlyTypes.ts";
import { groupOfDomain } from "../../src/lib/atlas/scholarlyGroups.ts";
import { normalizeSourceId } from "../lib/source-ref.ts";
import { GENERATED_DIR, PUBLIC_DIR } from "../lib/paths.ts";

// ── Builder inputs ──────────────────────────────────────────────────────────

/** One published atlas page, projected to the fields the builder needs. */
export interface ScholarlyPageInput {
    slug: string;
    title: string;
    kind: ScholarlyPageMeta["kind"];
    domain?: string;
    sources?: {
        primary?: string;
        references?: string[];
    };
}

/** One registry (`kind: paper`) entry, projected to the fields the builder needs. */
export interface ScholarlyPaperInput {
    id: string;
    year: number;
    /** Raw `cites:` list from index.yaml — unknown/non-registry ids are dropped by the builder. */
    cites: string[];
}

/** The subset of `AuthorsIndex` (scripts/authors-build.ts) the builder consumes.
 *  Both fields are already alias-resolved/canonical, so no further resolution
 *  happens here — see authors-build.ts#buildAuthorsIndex. */
export interface ScholarlyAuthorsInput {
    authors: Record<string, { name: string; orcid?: string; papers: string[] }>;
    paperAuthors: Record<string, string[]>;
}

/** One published narrative, projected to the page slugs and paper ids its nodes reach. */
export interface ScholarlyNarrativeInput {
    slug: string;
    title: string;
    pageSlugs: string[];
    paperIds: string[];
}

export interface BuildScholarlyIndexInput {
    pages: ScholarlyPageInput[];
    papers: ScholarlyPaperInput[];
    authorsIndex: ScholarlyAuthorsInput;
    narratives: ScholarlyNarrativeInput[];
}

// ── Small pure helpers ──────────────────────────────────────────────────────

function addTo(map: Map<string, Set<string>>, key: string, value: string): void {
    let set = map.get(key);
    if (!set) {
        set = new Set();
        map.set(key, set);
    }
    set.add(value);
}

/** Rounds to one decimal place (network coordinates). */
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

// ── Pure builder ─────────────────────────────────────────────────────────────

export function buildScholarlyIndex(input: BuildScholarlyIndexInput): ScholarlyIndex {
    const { pages, papers, authorsIndex, narratives } = input;

    const paperIdSet = new Set(papers.map((p) => p.id));
    const yearById = new Map(papers.map((p) => [p.id, p.year]));

    // ---- pages: resolve each page's primary/citing paper ids, dropping refs
    // that don't resolve to a registry paper (repo:/doc:/unknown ids). A page
    // that cites no registry paper carries no scholarly information and is
    // dropped from the output entirely (see ScholarlyIndex.pages doc comment).
    const pagesById = new Map<string, ScholarlyPageMeta>();
    const paperPrimaryPages = new Map<string, Set<string>>();
    const paperCitingPages = new Map<string, Set<string>>();

    for (const page of pages) {
        let primaryId: string | undefined;
        if (page.sources?.primary) {
            const id = normalizeSourceId(page.sources.primary);
            if (id && paperIdSet.has(id)) primaryId = id;
        }
        const citingIds = new Set<string>();
        for (const ref of page.sources?.references ?? []) {
            const id = normalizeSourceId(ref);
            if (id && paperIdSet.has(id) && id !== primaryId) citingIds.add(id);
        }
        if (!primaryId && citingIds.size === 0) continue;

        pagesById.set(page.slug, {
            title: page.title,
            kind: page.kind,
            ...(page.domain ? { domain: page.domain } : {}),
        });
        if (primaryId) addTo(paperPrimaryPages, primaryId, page.slug);
        for (const id of citingIds) addTo(paperCitingPages, id, page.slug);
    }

    const sortSlugsByTitle = (slugs: Iterable<string>): string[] =>
        [...slugs].sort((a, b) => pagesById.get(a)!.title.localeCompare(pagesById.get(b)!.title));

    const sortPaperIds = (ids: Iterable<string>): string[] =>
        [...new Set(ids)].sort((a, b) => {
            const ya = yearById.get(a) ?? 0;
            const yb = yearById.get(b) ?? 0;
            return ya !== yb ? ya - yb : a.localeCompare(b);
        });

    // ---- reverse citation map (registry papers only, no self-citations) ----
    const citedByMap = new Map<string, Set<string>>();
    for (const p of papers) {
        for (const c of p.cites) {
            if (!paperIdSet.has(c) || c === p.id) continue;
            addTo(citedByMap, c, p.id);
        }
    }

    // ---- narrative refs: direct paper-node hits first, then page-reachable ----
    const narrativesSorted = [...narratives].sort((a, b) => a.title.localeCompare(b.title));

    function narrativeRefsForPaper(paperId: string, primarySet: Set<string>, citingSet: Set<string>): ScholarlyNarrativeRef[] {
        const direct: ScholarlyNarrativeRef[] = [];
        const viaPage: ScholarlyNarrativeRef[] = [];
        for (const n of narrativesSorted) {
            if (n.paperIds.includes(paperId)) {
                direct.push({ slug: n.slug, title: n.title, via: "paper" });
                continue;
            }
            if (n.pageSlugs.some((s) => primarySet.has(s) || citingSet.has(s))) {
                viaPage.push({ slug: n.slug, title: n.title, via: "page" });
            }
        }
        return [...direct, ...viaPage];
    }

    // ---- papers ----
    const papersOut: Record<string, ScholarlyPaper> = {};
    for (const p of papers) {
        const primarySet = paperPrimaryPages.get(p.id) ?? new Set<string>();
        const citingSet = paperCitingPages.get(p.id) ?? new Set<string>();
        papersOut[p.id] = {
            primaryPages: sortSlugsByTitle(primarySet),
            citingPages: sortSlugsByTitle(citingSet),
            cites: sortPaperIds(p.cites.filter((c) => paperIdSet.has(c) && c !== p.id)),
            citedBy: sortPaperIds(citedByMap.get(p.id) ?? []),
            narratives: narrativeRefsForPaper(p.id, primarySet, citingSet),
        };
    }

    // ---- authors ----
    const authorsOut: Record<string, ScholarlyAuthor> = {};
    for (const [authorId, ref] of Object.entries(authorsIndex.authors)) {
        let firstYear = Infinity;
        let lastYear = -Infinity;
        const pageUnion = new Set<string>();
        const primaryPageUnion = new Set<string>();

        for (const paperId of ref.papers) {
            const year = yearById.get(paperId);
            if (year !== undefined) {
                if (year < firstYear) firstYear = year;
                if (year > lastYear) lastYear = year;
            }
            for (const slug of paperPrimaryPages.get(paperId) ?? []) {
                pageUnion.add(slug);
                primaryPageUnion.add(slug);
            }
            for (const slug of paperCitingPages.get(paperId) ?? []) pageUnion.add(slug);
        }

        const domainCounts = new Map<string, number>();
        for (const slug of pageUnion) {
            const domain = pagesById.get(slug)?.domain;
            if (domain) domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
        }
        const domains = [...domainCounts.entries()]
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.domain.localeCompare(b.domain)));

        authorsOut[authorId] = {
            firstYear: firstYear === Infinity ? 0 : firstYear,
            lastYear: lastYear === -Infinity ? 0 : lastYear,
            pageCount: pageUnion.size,
            primaryPages: sortSlugsByTitle(primaryPageUnion),
            domains,
            group: groupOfDomain(domains[0]?.domain),
        };
    }

    // ---- coauthorPapers: symmetric, built once per paper's author-id pairs ----
    const coauthorPapers: Record<string, Record<string, string[]>> = {};
    const bump = (a: string, b: string, paperId: string) => {
        const row = (coauthorPapers[a] ??= {});
        (row[b] ??= []).push(paperId);
    };
    for (const [paperId, authorIds] of Object.entries(authorsIndex.paperAuthors)) {
        for (let i = 0; i < authorIds.length; i++) {
            for (let j = i + 1; j < authorIds.length; j++) {
                bump(authorIds[i], authorIds[j], paperId);
                bump(authorIds[j], authorIds[i], paperId);
            }
        }
    }
    for (const row of Object.values(coauthorPapers)) {
        for (const key of Object.keys(row)) row[key] = sortPaperIds(row[key]);
    }

    // ---- network ----
    const authorIds = Object.keys(authorsOut).sort((a, b) => a.localeCompare(b));
    const edges: [string, string, number][] = [];
    for (const a of authorIds) {
        const row = coauthorPapers[a];
        if (!row) continue;
        for (const b of Object.keys(row)) {
            if (a < b) edges.push([a, b, row[b].length]);
        }
    }
    const network = layoutNetwork(authorIds, edges, authorsOut);

    return {
        pages: Object.fromEntries(pagesById),
        papers: papersOut,
        authors: authorsOut,
        coauthorPapers,
        network,
    };
}

// ── Network layout ───────────────────────────────────────────────────────────

/** Per-group anchor points the People network's `forceX`/`forceY` pull nodes
 *  toward, so the five communities settle into recognisable regions instead of
 *  a single amorphous blob. Values tuned against the current (~2026-09) graph
 *  size; revisit if the author count grows substantially. */
const GROUP_ANCHORS: Record<ScholarlyGroup, [number, number]> = {
    recognition: [-230, -40],
    representation: [210, -120],
    features: [-40, 200],
    geometry: [280, 190],
    calibration: [-330, 210],
    other: [0, 0],
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Deterministic initial placement (phyllotaxis spiral), indexed by a node's
 *  position in the id-sorted node array — never `Math.random`. */
function initialPosition(i: number): [number, number] {
    const r = 8 * Math.sqrt(i + 0.5);
    const theta = i * GOLDEN_ANGLE;
    return [r * Math.cos(theta), r * Math.sin(theta)];
}

/** Same linear congruential generator d3-force uses internally by default
 *  (see node_modules/d3-force/src/lcg.js), parameterized by seed so the
 *  simulation's "randomized direction for coincident nodes" jiggle is
 *  reproducible independent of d3-force's own default-seeding behavior. */
function lcg(seed: number): () => number {
    const a = 1664525;
    const c = 1013904223;
    const m = 4294967296;
    let s = ((seed % m) + m) % m || 1;
    return () => (s = (a * s + c) % m) / m;
}

interface SimNode extends SimulationNodeDatum {
    id: string;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
    count: number;
}

const SIMULATION_TICKS = 500;

/** Runs a deterministic force-directed layout over the co-author graph.
 *  `nodeIds` need not be pre-sorted — this function sorts them itself so the
 *  simulation's node order (and therefore its result) never depends on
 *  caller iteration order. Pure and side-effect-free: safe to call twice on
 *  the same input and expect a deep-equal result. */
export function layoutNetwork(
    nodeIds: string[],
    edges: [string, string, number][],
    meta: Record<string, Pick<ScholarlyAuthor, "group" | "pageCount">>,
): ScholarlyIndex["network"] {
    const sortedIds = [...nodeIds].sort((a, b) => a.localeCompare(b));

    if (sortedIds.length === 0) {
        return { nodes: [], edges, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    }

    const nodes: SimNode[] = sortedIds.map((id, i) => {
        const [x, y] = initialPosition(i);
        return { id, x, y };
    });
    const links: SimLink[] = edges.map(([a, b, count]) => ({ source: a, target: b, count }));

    const groupOf = (id: string): ScholarlyGroup => meta[id]?.group ?? "other";
    const pageCountOf = (id: string): number => meta[id]?.pageCount ?? 0;

    const simulation = forceSimulation<SimNode, SimLink>(nodes)
        .randomSource(lcg(1))
        .force(
            "link",
            forceLink<SimNode, SimLink>(links)
                .id((d) => d.id)
                .distance(18)
                .strength(0.6),
        )
        .force("charge", forceManyBody<SimNode>().strength(-16))
        .force(
            "x",
            forceX<SimNode>((d) => GROUP_ANCHORS[groupOf(d.id)][0]).strength(0.06),
        )
        .force(
            "y",
            forceY<SimNode>((d) => GROUP_ANCHORS[groupOf(d.id)][1]).strength(0.06),
        )
        .force(
            "collide",
            forceCollide<SimNode>((d) => 2.5 + Math.sqrt(pageCountOf(d.id)) * 1.6),
        )
        .stop();

    for (let i = 0; i < SIMULATION_TICKS; i++) simulation.tick();

    const outNodes: ScholarlyNetworkNode[] = nodes.map((n) => ({ id: n.id, x: round1(n.x!), y: round1(n.y!) }));
    const bounds = {
        minX: Math.min(...outNodes.map((n) => n.x)),
        minY: Math.min(...outNodes.map((n) => n.y)),
        maxX: Math.max(...outNodes.map((n) => n.x)),
        maxY: Math.max(...outNodes.map((n) => n.y)),
    };

    return { nodes: outNodes, edges, bounds };
}

// ── Emission ─────────────────────────────────────────────────────────────────

/** Writes public/scholarly-index.json (minified data) and
 *  src/generated/scholarly-index.ts (a tiny type shim + fetch URL, no data —
 *  mirrors src/generated/papers-index.ts / authors-index.ts). */
export function emitScholarlyIndex(index: ScholarlyIndex): void {
    const jsonPath = join(PUBLIC_DIR, "scholarly-index.json");
    writeFileSync(jsonPath, JSON.stringify(index), "utf-8");

    const tsLines = [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        "// The actual scholarly-index data lives in /scholarly-index.json (loaded lazily).",
        "",
        'import type { ScholarlyIndex } from "../lib/atlas/scholarlyTypes.ts";',
        "",
        "export type { ScholarlyIndex };",
        "",
        "/** Public URL of the JSON asset emitted by content:build. */",
        'export const SCHOLARLY_INDEX_URL = "/scholarly-index.json";',
        "",
    ];
    writeFileSync(join(GENERATED_DIR, "scholarly-index.ts"), tsLines.join("\n"), "utf-8");
}
