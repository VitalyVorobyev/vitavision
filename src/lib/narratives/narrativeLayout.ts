// Pure layout / theming helpers for the narrative constellation canvas.
//
// Narrative lens coordinates are authored in grid units: 1.0 on either axis is
// one chip pitch (chip size + gap), and only differences matter — the layout
// is translated so the minimum sits at the origin. Fractional values are fine
// for nudges (`3.6`, `6.5`), but chips whose x-distance within the same row
// falls under one chip width would overlap, so a per-row collision pass pushes
// them apart while preserving authored order. The result is handed to the
// shared graph machinery (`useViewport`, `buildEdge`).
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

/** Resolved `var(--graph-rel-*)` colour for a narrative edge type. */
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

/** Minimum clear space kept between chips in the same row by the collision pass. */
const MIN_ROW_CLEARANCE = 24;

/**
 * Scale a lens's grid-unit coordinates to content pixels: one authored unit is
 * one chip pitch (chip + gap) per axis, translated so the minimum is at the
 * origin. A per-row collision pass then pushes chips apart left-to-right
 * wherever fractional authored nudges would make same-row chips overlap —
 * authored order within a row is always preserved.
 *
 * Degenerate inputs are handled: a lens with no coords, a single node, or all
 * nodes sharing an axis value all collapse that axis to zero extent.
 */
export function scaleLensCoords(coords: Record<string, [number, number]>): NarrativeLayout {
    const entries = Object.entries(coords);
    const ids = entries.map(([id]) => id);
    if (ids.length === 0) {
        return { positions: {}, width: NARRATIVE_NODE_W, height: NARRATIVE_NODE_H };
    }

    const minX = Math.min(...entries.map(([, xy]) => xy[0]));
    const minY = Math.min(...entries.map(([, xy]) => xy[1]));

    const positions: Record<string, { x: number; y: number }> = {};
    // Every id in `ids` is assigned in the loop below, so this lookup is always defined.
    const at = (id: string) => positions[id]!;
    for (const [id, [x, y]] of entries) {
        positions[id] = {
            x: (x - minX) * (NARRATIVE_NODE_W + GAP_X),
            y: (y - minY) * (NARRATIVE_NODE_H + GAP_Y),
        };
    }

    // Group chips into rows (y-distance under one chip height = same row) and
    // enforce a minimum x pitch within each row, pushing rightwards.
    const byY = [...ids].sort((a, b) => at(a).y - at(b).y || at(a).x - at(b).x);
    const rows: string[][] = [];
    for (const id of byY) {
        const row = rows[rows.length - 1];
        const prev = row?.[row.length - 1];
        if (row !== undefined && prev !== undefined && at(id).y - at(prev).y < NARRATIVE_NODE_H) {
            row.push(id);
        } else {
            rows.push([id]);
        }
    }
    const minPitch = NARRATIVE_NODE_W + MIN_ROW_CLEARANCE;
    for (const row of rows) {
        row.sort((a, b) => at(a).x - at(b).x);
        for (let i = 1; i < row.length; i++) {
            const prevId = row[i - 1];
            const id = row[i];
            if (prevId === undefined || id === undefined) continue; // unreachable: 1 <= i < row.length
            const prevX = at(prevId).x;
            if (at(id).x < prevX + minPitch) {
                positions[id] = { ...at(id), x: prevX + minPitch };
            }
        }
    }

    return {
        positions,
        width:  Math.max(...ids.map((id) => at(id).x)) + NARRATIVE_NODE_W,
        height: Math.max(...ids.map((id) => at(id).y)) + NARRATIVE_NODE_H,
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
    if (step === undefined) return []; // unreachable: TICK_STEPS is non-empty

    const ticks: number[] = [];
    for (let y = Math.ceil(minYear / step) * step; y <= maxYear; y += step) ticks.push(y);
    return ticks;
}

/** Year range across every node that carries one, or null when none do. */
export function narrativeYearRange(nodes: readonly NarrativeNode[]): { min: number; max: number } | null {
    const years = nodes
        .map((n) => ("year" in n ? n.year : undefined))
        .filter((y): y is number => typeof y === "number");
    if (years.length === 0) return null;
    return { min: Math.min(...years), max: Math.max(...years) };
}
