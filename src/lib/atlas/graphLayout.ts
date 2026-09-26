// graphLayout.ts — pure layout/data logic for the Atlas GraphExplorer.
//
// No React here: constants, relation metadata, the lane layout algorithm,
// the single categorize() used by both the desktop canvas and the mobile
// list view, and initial-focus resolution. Extracted from GraphExplorer.tsx
// so the algorithm can be unit-tested without mounting the component tree.

import { contentGraph } from "../../generated/content-graph.ts";
import { algorithmPages } from "../../generated/content-index.ts";
import type { ViewportBounds } from "../graph/useViewport.ts";
import { graphKindAccent, graphRelColor } from "../graph/graphTheme.ts";
import { getNeighbors } from "./graphNeighbors.ts";

// ── Constants (ported verbatim from direction-2-graph.jsx) ─────────────────────

export const GG = {
    canvasMinW: 1020,
    canvasMinH: 580,
    centerW:    220,
    centerH:     96,
    nodeW:      184,
    nodeH:       68,
    pad:         24,
    gap:         12,
    laneOff:     20,
    trailMaxVisible: 4,
} as const;

// ── Relation metadata (ported verbatim from direction-2-graph.jsx) ─────────────

export interface RelationMeta {
    label:   string;
    short:   string;
    color:   string;
    arrow:   "in" | "out" | "none";
    dashed?: boolean;
}

export const RELATION_V3: Record<string, RelationMeta> = {
    prerequisites:          { label: "builds on",              short: "prereq",   color: graphRelColor("prerequisites"),          arrow: "in"  },
    extended_from:          { label: "extended from",          short: "ext from", color: graphRelColor("extended_from"),          arrow: "in"  },
    compared_with:          { label: "compared with",          short: "vs",       color: graphRelColor("compared_with"),          arrow: "none", dashed: true },
    extended_by:            { label: "extended by",            short: "ext by",   color: graphRelColor("extended_by"),            arrow: "out" },
    feeds_into:             { label: "feeds into",             short: "feeds",    color: graphRelColor("feeds_into"),             arrow: "out" },
    learned_by:             { label: "learned alt of",         short: "learn",    color: graphRelColor("learned_by"),             arrow: "out" },
    used_by:                { label: "used by",                short: "used by",  color: graphRelColor("used_by"),                arrow: "out" },
    fed_by:                 { label: "fed by",                 short: "fed by",   color: graphRelColor("fed_by"),                 arrow: "in"  },
    learned_alternative_of: { label: "learned alternative of", short: "learns",   color: graphRelColor("learned_alternative_of"), arrow: "out" },
};

export const LANES_V3 = [
    "prerequisites",
    "extended_from",
    "compared_with",
    "extended_by",
    "feeds_into",
    "learned_by",
    "used_by",
    "fed_by",
    "learned_alternative_of",
] as const;

export type RelKey = typeof LANES_V3[number];

// ── Data types ─────────────────────────────────────────────────────────────────

export interface PositionedNode {
    slug: string;
    rel:  RelKey;
    x:    number;
    y:    number;
}

export interface Layout {
    positions: PositionedNode[];
    canvasW:   number;
    canvasH:   number;
    cx:        number;
    cy:        number;
}

export interface ByRel {
    prerequisites:          string[];
    extended_from:          string[];
    compared_with:          string[];
    extended_by:            string[];
    feeds_into:             string[];
    learned_by:             string[];
    used_by:                string[];
    fed_by:                 string[];
    learned_alternative_of: string[];
}

// ── KIND_LABEL / KIND_ACCENT — shared entry-kind presentation ──────────────────

export const KIND_LABEL: Record<string, string> = {
    algorithm: "Algorithm",
    model:     "Model",
    concept:   "Concept",
};

export const KIND_ACCENT: Record<string, string> = {
    algorithm: graphKindAccent("algorithm"),
    model:     graphKindAccent("model"),
    concept:   graphKindAccent("concept"),
};

// ── Mobile relation metadata ───────────────────────────────────────────────────

export const REL_M: Record<RelKey, { label: string; color: string }> = {
    prerequisites:          { label: "Builds on",               color: graphRelColor("prerequisites")          },
    extended_from:          { label: "Extended from",           color: graphRelColor("extended_from")          },
    compared_with:          { label: "Compared with",           color: graphRelColor("compared_with")          },
    extended_by:            { label: "Extended by",             color: graphRelColor("extended_by")            },
    feeds_into:             { label: "Feeds into",              color: graphRelColor("feeds_into")             },
    learned_by:             { label: "Learned alternatives",    color: graphRelColor("learned_by")             },
    used_by:                { label: "Used by",                 color: graphRelColor("used_by")                },
    fed_by:                 { label: "Fed by",                  color: graphRelColor("fed_by")                 },
    learned_alternative_of: { label: "Learned alternative of",  color: graphRelColor("learned_alternative_of") },
};

// ── categorize ─────────────────────────────────────────────────────────────────

/**
 * Buckets a slug's neighbors by relation, filtered to known (non-draft)
 * content-graph nodes and deduplicated across buckets (in LANES_V3 order —
 * first bucket a slug appears in wins). Shared by the desktop canvas and the
 * mobile list view; `getNeighbors` already dedups across its own priority
 * order, so this second pass is a defensive no-op in practice but kept for
 * parity with the original implementation.
 */
export function categorize(slug: string): ByRel | null {
    const n = getNeighbors(slug);
    if (!n) return null;
    const seen = new Set<string>([slug]);
    const out: Partial<ByRel> = {};
    for (const rel of LANES_V3) {
        out[rel] = [];
        for (const s of (n[rel] ?? [])) {
            // Only include nodes that exist in the content graph (non-draft)
            if (seen.has(s) || !(s in contentGraph.nodes)) continue;
            seen.add(s);
            (out[rel] as string[]).push(s);
        }
    }
    return out as ByRel;
}

// ── computeLayout ──────────────────────────────────────────────────────────────

export function computeLayout(byRel: ByRel): Layout {
    const wList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.prerequisites.map((s) => ({ slug: s, rel: "prerequisites" as RelKey })),
        ...byRel.extended_from.map((s) => ({ slug: s, rel: "extended_from" as RelKey })),
        ...byRel.fed_by.map((s) => ({ slug: s, rel: "fed_by" as RelKey })),
    ];
    const eList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.extended_by.map((s) => ({ slug: s, rel: "extended_by" as RelKey })),
        ...byRel.feeds_into.map((s) => ({ slug: s, rel: "feeds_into" as RelKey })),
        ...byRel.used_by.map((s) => ({ slug: s, rel: "used_by" as RelKey })),
    ];
    const nList: Array<{ slug: string; rel: RelKey }> = byRel.compared_with.map((s) => ({ slug: s, rel: "compared_with" }));
    const sList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.learned_by.map((s) => ({ slug: s, rel: "learned_by" as RelKey })),
        ...byRel.learned_alternative_of.map((s) => ({ slug: s, rel: "learned_alternative_of" as RelKey })),
    ];

    const wrapAt = 5;
    const nRowsReal = nList.length ? Math.ceil(nList.length / wrapAt) : 0;
    const sRowsReal = sList.length ? Math.ceil(sList.length / wrapAt) : 0;

    const wHeight = wList.length * (GG.nodeH + GG.gap);
    const eHeight = eList.length * (GG.nodeH + GG.gap);
    const vNeeded = Math.max(wHeight, eHeight, GG.centerH + 80);
    const nBlock  = nRowsReal * (GG.nodeH + GG.gap) + (nRowsReal ? 40 : 0);
    const sBlock  = sRowsReal * (GG.nodeH + GG.gap) + (sRowsReal ? 40 : 0);
    const canvasH = Math.max(GG.canvasMinH, vNeeded + nBlock + sBlock + GG.pad * 2);

    const nW = Math.min(wrapAt, nList.length) * (GG.nodeW + GG.gap);
    const sW = Math.min(wrapAt, sList.length) * (GG.nodeW + GG.gap);
    const middleNeeded = Math.max(GG.centerW + 80, nW, sW);
    const canvasW = Math.max(
        GG.canvasMinW,
        middleNeeded + 2 * (GG.pad + GG.nodeW + 40),
    );

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    const positions: PositionedNode[] = [];

    // West stack
    {
        const totalH = wList.length * GG.nodeH + Math.max(0, wList.length - 1) * GG.gap;
        let y = cy - totalH / 2;
        for (const item of wList) {
            positions.push({ ...item, x: GG.pad, y });
            y += GG.nodeH + GG.gap;
        }
    }
    // East stack
    {
        const totalH = eList.length * GG.nodeH + Math.max(0, eList.length - 1) * GG.gap;
        let y = cy - totalH / 2;
        for (const item of eList) {
            positions.push({ ...item, x: canvasW - GG.pad - GG.nodeW, y });
            y += GG.nodeH + GG.gap;
        }
    }
    // North rows
    for (let r = 0; r < nRowsReal; r++) {
        const row = nList.slice(r * wrapAt, (r + 1) * wrapAt);
        const rowW = row.length * GG.nodeW + Math.max(0, row.length - 1) * GG.gap;
        let x = cx - rowW / 2;
        const y = GG.pad + r * (GG.nodeH + GG.gap);
        for (const item of row) {
            positions.push({ ...item, x, y });
            x += GG.nodeW + GG.gap;
        }
    }
    // South rows
    for (let r = 0; r < sRowsReal; r++) {
        const row = sList.slice(r * wrapAt, (r + 1) * wrapAt);
        const rowW = row.length * GG.nodeW + Math.max(0, row.length - 1) * GG.gap;
        let x = cx - rowW / 2;
        const y = canvasH - GG.pad - GG.nodeH - r * (GG.nodeH + GG.gap);
        for (const item of row) {
            positions.push({ ...item, x, y });
            x += GG.nodeW + GG.gap;
        }
    }

    return { positions, canvasW, canvasH, cx, cy };
}

// ── layoutBounds — bbox of a layout, for useViewport's fitView ────────────────

export function layoutBounds(layout: Layout): ViewportBounds {
    let minX = layout.cx - GG.centerW / 2;
    let minY = layout.cy - GG.centerH / 2;
    let maxX = layout.cx + GG.centerW / 2;
    let maxY = layout.cy + GG.centerH / 2;

    for (const pos of layout.positions) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + GG.nodeW);
        maxY = Math.max(maxY, pos.y + GG.nodeH);
    }
    return { minX, minY, maxX, maxY };
}

// ── Default focus resolution ───────────────────────────────────────────────────

export function resolveInitialSlug(focusSlug: string | undefined): string | null {
    if (focusSlug && focusSlug in contentGraph.nodes && getNeighbors(focusSlug) !== null) {
        return focusSlug;
    }
    // Fall back to first algorithmPage with non-null getNeighbors
    for (const page of algorithmPages) {
        if (!page.frontmatter.draft && getNeighbors(page.slug) !== null) {
            return page.slug;
        }
    }
    return null;
}
