import type { CalibrationCorner, CalibrationMarker, FramePoint } from "../../../../lib/types";
import type { Feature } from "../../../../store/editor/useEditorStore";
import { toCanvasCoordinate } from "./shared";

/* ── feature lookup by grid coords ──────────────────────────── */

export function buildFeatureIdByGrid(features: Feature[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const f of features) {
        if (f.meta?.grid) {
            map.set(`${f.meta.grid.i}:${f.meta.grid.j}`, f.id);
        }
    }
    return map;
}

/* ── corner grid ─────────────────────────────────────────────── */

export interface GridNode {
    x: number;
    y: number;
    i: number;
    j: number;
    cornerId: number | null;
}

export interface GridEdge {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface CornerGrid {
    nodes: Map<string, GridNode>;
    rows: number[][];   // nodes grouped by i, sorted by j
    cols: number[][];   // nodes grouped by j, sorted by i
    minI: number;
    maxI: number;
    minJ: number;
    maxJ: number;
}

function gridKey(i: number, j: number): string {
    return `${i}:${j}`;
}

export function buildCornerGrid(corners: CalibrationCorner[]): CornerGrid {
    const nodes = new Map<string, GridNode>();
    const rowMap = new Map<number, GridNode[]>();
    const colMap = new Map<number, GridNode[]>();

    let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;

    for (const c of corners) {
        if (!c.grid) continue;
        const { i, j } = c.grid;
        const node: GridNode = {
            x: toCanvasCoordinate(c.x),
            y: toCanvasCoordinate(c.y),
            i,
            j,
            cornerId: c.corner_id,
        };
        nodes.set(gridKey(i, j), node);

        if (!rowMap.has(i)) rowMap.set(i, []);
        rowMap.get(i)!.push(node);

        if (!colMap.has(j)) colMap.set(j, []);
        colMap.get(j)!.push(node);

        minI = Math.min(minI, i);
        maxI = Math.max(maxI, i);
        minJ = Math.min(minJ, j);
        maxJ = Math.max(maxJ, j);
    }

    // Sort each row by j, each col by i
    const rows: number[][] = [];
    for (const [, group] of [...rowMap.entries()].sort(([a], [b]) => a - b)) {
        group.sort((a, b) => a.j - b.j);
        rows.push(group.map((n) => n.j));
    }

    const cols: number[][] = [];
    for (const [, group] of [...colMap.entries()].sort(([a], [b]) => a - b)) {
        group.sort((a, b) => a.i - b.i);
        cols.push(group.map((n) => n.i));
    }

    return { nodes, rows, cols, minI, maxI, minJ, maxJ };
}

/* ── grid edges ──────────────────────────────────────────────── */

export function buildGridEdges(grid: CornerGrid): { rowEdges: GridEdge[]; colEdges: GridEdge[] } {
    const rowEdges: GridEdge[] = [];
    const colEdges: GridEdge[] = [];

    // Row edges: connect adjacent corners sharing the same i
    for (const [iStr, nodes] of groupByI(grid)) {
        const i = Number(iStr);
        const sorted = nodes.sort((a, b) => a.j - b.j);
        for (let k = 0; k < sorted.length - 1; k++) {
            const a = sorted[k];
            const b = sorted[k + 1];
            // Only connect if j values are adjacent (differ by 1)
            if (b.j - a.j === 1) {
                rowEdges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
            }
        }
        void i; // used only for iteration
    }

    // Col edges: connect adjacent corners sharing the same j
    for (const [jStr, nodes] of groupByJ(grid)) {
        const j = Number(jStr);
        const sorted = nodes.sort((a, b) => a.i - b.i);
        for (let k = 0; k < sorted.length - 1; k++) {
            const a = sorted[k];
            const b = sorted[k + 1];
            if (b.i - a.i === 1) {
                colEdges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
            }
        }
        void j;
    }

    return { rowEdges, colEdges };
}

function groupByI(grid: CornerGrid): Map<string, GridNode[]> {
    const map = new Map<string, GridNode[]>();
    for (const node of grid.nodes.values()) {
        const k = String(node.i);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(node);
    }
    return map;
}

function groupByJ(grid: CornerGrid): Map<string, GridNode[]> {
    const map = new Map<string, GridNode[]>();
    for (const node of grid.nodes.values()) {
        const k = String(node.j);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(node);
    }
    return map;
}

/* ── marker polygons ─────────────────────────────────────────── */

export interface MarkerPolygon {
    id: number;
    points: number[]; // flat [x1,y1,x2,y2,...] for Konva Line
    center: { x: number; y: number };
}

export function buildMarkerPolygons(markers: CalibrationMarker[]): MarkerPolygon[] {
    return markers
        .filter((m) => m.corners_img && m.corners_img.length >= 3)
        .map((m) => {
            const corners = m.corners_img as FramePoint[];
            const points = corners.flatMap((c) => [toCanvasCoordinate(c.x), toCanvasCoordinate(c.y)]);
            const cx = corners.reduce((s, c) => s + toCanvasCoordinate(c.x), 0) / corners.length;
            const cy = corners.reduce((s, c) => s + toCanvasCoordinate(c.y), 0) / corners.length;
            return { id: m.id, points, center: { x: cx, y: cy } };
        });
}
