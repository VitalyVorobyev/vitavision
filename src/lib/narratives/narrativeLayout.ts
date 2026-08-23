// Pure layout / theming helpers for the narrative constellation canvas.
//
// Narrative lens coordinates are arbitrary authored units (a lens might use
// `[0,0] … [3,1]`, another `[12,-4] … [90,40]`). This module normalizes them
// to a unit square and multiplies back out to a pixel extent sized so that
// adjacent distinct rows/columns clear the node chip, then hands the result
// to the shared graph machinery (`useViewport`, `buildEdge`).
//
// No React, no DOM — everything here is unit-testable.

import type { NarrativeEdgeType, NarrativeNode } from "../content/schema.ts";
import { graphRelColor, type GraphRelKey } from "../graph/graphTheme.ts";
import type { Box } from "../graph/edgeGeometry.ts";

// ── Node chip metrics (content coordinates) ─────────────────────────────────

export const NARRATIVE_NODE_W = 178;
export const NARRATIVE_NODE_H = 62;
/** Vertical room reserved above the graph for the timeline lens's year ruler. */
export const NARRATIVE_TOP_PAD = 44;

const GAP_X = 92;
const GAP_Y = 72;

// ── Edge type → theme token ─────────────────────────────────────────────────

/**
 * The four narrative edge types mapped onto the site's existing `--graph-rel-*`
 * tokens. Single source of truth — the canvas, the legend, and the mobile view
 * all read from here.
 */
export const NARRATIVE_EDGE_REL: Record<NarrativeEdgeType, GraphRelKey> = {
    prerequisite: "prerequisites",
    evolution:    "extended_by",
    bridge:       "feeds_into",
    contrast:     "compared_with",
};

export const NARRATIVE_EDGE_LABEL: Record<NarrativeEdgeType, string> = {
    prerequisite: "Prerequisite",
    evolution:    "Evolution",
    bridge:       "Bridge",
    contrast:     "Contrast",
};

/**
 * Stroke dash per edge type. `prerequisite` and `bridge` resolve to the same
 * `--graph-rel-*` hue in both themes, so the dash pattern (not colour alone)
 * is what keeps the four types distinguishable.
 */
export const NARRATIVE_EDGE_DASH: Record<NarrativeEdgeType, string | undefined> = {
    prerequisite: undefined,
    evolution:    undefined,
    bridge:       "5 4",
    contrast:     "1.5 4",
};

/** Resolved `hsl(var(--graph-rel-*))` colour for a narrative edge type. */
export function narrativeEdgeColor(type: NarrativeEdgeType): string {
    return graphRelColor(NARRATIVE_EDGE_REL[type]);
}

// ── Area palette ────────────────────────────────────────────────────────────

// Narrative `areas` are author-defined ids with no design tokens of their own,
// so colour is assigned positionally: stable per narrative, distinct enough in
// both themes at mid lightness.
const AREA_HUES = [199, 265, 32, 152, 340, 88, 222, 12];

/** Deterministic colour for an area id, given the narrative's ordered area list. */
export function areaColor(areaIds: readonly string[], areaId: string): string {
    const i = areaIds.indexOf(areaId);
    const hue = AREA_HUES[(i < 0 ? 0 : i) % AREA_HUES.length];
    return `hsl(${hue} 62% 48%)`;
}

// ── Lens coordinate scaling ─────────────────────────────────────────────────

export interface NarrativeLayout {
    /** Node id → top-left corner of its chip, in content pixels. */
    positions: Record<string, { x: number; y: number }>;
    /** Full content extent including the chip's own width/height. */
    width:  number;
    height: number;
}

function distinctCount(values: number[]): number {
    return new Set(values.map((v) => v.toFixed(6))).size;
}

/**
 * Normalize a lens's arbitrary coordinate space to [0,1], then scale it out to
 * a pixel extent large enough that adjacent distinct rows/columns don't collide.
 *
 * Degenerate inputs are handled: a lens with no coords, a single node, or all
 * nodes sharing an axis value all collapse that axis to zero extent.
 */
export function scaleLensCoords(coords: Record<string, [number, number]>): NarrativeLayout {
    const ids = Object.keys(coords);
    if (ids.length === 0) {
        return { positions: {}, width: NARRATIVE_NODE_W, height: NARRATIVE_NODE_H };
    }

    const xs = ids.map((id) => coords[id][0]);
    const ys = ids.map((id) => coords[id][1]);

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const spanX = maxX - minX;
    const spanY = maxY - minY;

    const extentX = spanX > 0 ? (distinctCount(xs) - 1) * (NARRATIVE_NODE_W + GAP_X) : 0;
    const extentY = spanY > 0 ? (distinctCount(ys) - 1) * (NARRATIVE_NODE_H + GAP_Y) : 0;

    const positions: Record<string, { x: number; y: number }> = {};
    for (const id of ids) {
        const [x, y] = coords[id];
        positions[id] = {
            x: spanX > 0 ? ((x - minX) / spanX) * extentX : 0,
            y: spanY > 0 ? ((y - minY) / spanY) * extentY : 0,
        };
    }

    return {
        positions,
        width:  extentX + NARRATIVE_NODE_W,
        height: extentY + NARRATIVE_NODE_H,
    };
}

/** Chip box for a laid-out node, in the same space `buildEdge` expects. */
export function nodeBox(pos: { x: number; y: number }): Box {
    return { x: pos.x, y: pos.y + NARRATIVE_TOP_PAD, w: NARRATIVE_NODE_W, h: NARRATIVE_NODE_H };
}

// ── Year ruler (timeline lens) ──────────────────────────────────────────────

const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

/**
 * Round year ticks covering `[minYear, maxYear]`, using the smallest "nice"
 * step that keeps the tick count at or below `maxTicks`.
 */
export function yearRulerTicks(minYear: number, maxYear: number, maxTicks = 8): number[] {
    if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) return [];
    if (maxYear <= minYear) return [minYear];

    const span = maxYear - minYear;
    const step = TICK_STEPS.find((s) => span / s <= maxTicks) ?? TICK_STEPS[TICK_STEPS.length - 1];

    const ticks: number[] = [];
    for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) ticks.push(y);
    return ticks;
}

/** Year range across every node that carries one, or null when none do. */
export function narrativeYearRange(nodes: readonly NarrativeNode[]): { min: number; max: number } | null {
    const years = nodes.map((n) => n.year).filter((y): y is number => typeof y === "number");
    if (years.length === 0) return null;
    return { min: Math.min(...years), max: Math.max(...years) };
}
