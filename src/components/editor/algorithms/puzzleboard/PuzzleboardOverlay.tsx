import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { PuzzleBoardDetectResult, PuzzleBoardLabeledCorner, PuzzleBoardObservedEdge } from "../../../../lib/types";
import type { Feature, LabeledPointFeature, OverlayToggles } from "../../../../store/editor/useEditorStore";
import type { GridEdge, GridNode } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "../../canvas/overlays/GridEdgesGroup";
import { overlayTheme } from "../../canvas/overlays/overlayTheme";

interface PuzzleboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
    onSelectFeature?: (featureId: string) => void;
    features?: Feature[];
}

const LABEL_MIN_ZOOM = 0.5;
const MASTER_PERIOD = 501;
const WHITE_BIT_STROKE = "#38bdf8"; // sky-400 — outlines white puzzle dots (bit=1)
const BLACK_BIT_STROKE = "#f97316"; // orange-500 — outlines black puzzle dots (bit=0)

interface EdgeMarker {
    key: string;
    x: number;
    y: number;
    radius: number;
    stroke: string;
    opacity: number;
}

/**
 * Build marker circles for observed_edges.
 * Each edge sits at the midpoint between two adjacent corners. Local pre-alignment
 * coords (e.row, e.col) are mapped into master indices via `alignment.transform`
 * (mod 501); the corresponding corners are then looked up by their published master
 * indices. Mirrors the calib-targets demo's ImageCanvas rendering.
 */
function buildEdgeMarkers(
    edges: PuzzleBoardObservedEdge[],
    corners: PuzzleBoardLabeledCorner[],
    alignment: PuzzleBoardDetectResult["alignment"],
): EdgeMarker[] {
    if (!edges.length || !corners.length || !alignment) return [];

    const byGrid = new Map<string, PuzzleBoardLabeledCorner>();
    for (const c of corners) {
        if (c.grid) byGrid.set(`${c.grid.i},${c.grid.j}`, c);
    }

    const { a, b, c: tc, d } = alignment.transform;
    const [tx, ty] = alignment.translation;
    const toMaster = (i: number, j: number): [number, number] => [
        ((a * i + b * j + tx) % MASTER_PERIOD + MASTER_PERIOD) % MASTER_PERIOD,
        ((tc * i + d * j + ty) % MASTER_PERIOD + MASTER_PERIOD) % MASTER_PERIOD,
    ];

    const markers: EdgeMarker[] = [];
    for (let idx = 0; idx < edges.length; idx++) {
        const e = edges[idx];
        // Horizontal edge at (row=r, col=c): connects local (i=c, j=r) → (i=c+1, j=r).
        // Vertical   edge at (row=r, col=c): connects local (i=c, j=r) → (i=c,   j=r+1).
        const [ai, aj] = toMaster(e.col, e.row);
        const [bi, bj] = e.orientation === "horizontal"
            ? toMaster(e.col + 1, e.row)
            : toMaster(e.col, e.row + 1);
        const ca = byGrid.get(`${ai},${aj}`);
        const cb = byGrid.get(`${bi},${bj}`);
        if (!ca || !cb) continue;

        const mx = 0.5 * (ca.x + cb.x);
        const my = 0.5 * (ca.y + cb.y);
        const dx = cb.x - ca.x;
        const dy = cb.y - ca.y;
        const edgeLen = Math.hypot(dx, dy);
        // The puzzle bump diameter ≈ half the edge length, so radius ≈ 0.25 · edgeLen.
        const radius = Math.max(3, 0.25 * edgeLen);
        const conf = Math.min(1, Math.max(0, e.confidence));
        markers.push({
            key: `${e.orientation}-${e.row}-${e.col}-${idx}`,
            x: mx,
            y: my,
            radius,
            stroke: e.bit === 1 ? WHITE_BIT_STROKE : BLACK_BIT_STROKE,
            opacity: 0.35 + 0.65 * conf,
        });
    }
    return markers;
}

function buildPuzzleGrid(corners: PuzzleBoardDetectResult["detection"]["corners"]): {
    nodes: Map<string, GridNode & { featureId?: string }>;
    rowEdges: GridEdge[];
    colEdges: GridEdge[];
} {
    const nodes = new Map<string, GridNode & { featureId?: string }>();
    const rowMap = new Map<number, Array<GridNode & { featureId?: string }>>();
    const colMap = new Map<number, Array<GridNode & { featureId?: string }>>();

    for (const c of corners) {
        if (!c.grid) continue;
        const { i, j } = c.grid;
        const key = `${i}:${j}`;
        const node = { x: c.x, y: c.y, i, j, cornerId: c.master_id, featureId: c.id };
        nodes.set(key, node);

        if (!rowMap.has(i)) rowMap.set(i, []);
        rowMap.get(i)!.push(node);

        if (!colMap.has(j)) colMap.set(j, []);
        colMap.get(j)!.push(node);
    }

    const rowEdges: GridEdge[] = [];
    for (const group of rowMap.values()) {
        group.sort((a, b) => a.j - b.j);
        for (let k = 0; k < group.length - 1; k++) {
            if (group[k + 1].j - group[k].j === 1) {
                rowEdges.push({ x1: group[k].x, y1: group[k].y, x2: group[k + 1].x, y2: group[k + 1].y });
            }
        }
    }

    const colEdges: GridEdge[] = [];
    for (const group of colMap.values()) {
        group.sort((a, b) => a.i - b.i);
        for (let k = 0; k < group.length - 1; k++) {
            if (group[k + 1].i - group[k].i === 1) {
                colEdges.push({ x1: group[k].x, y1: group[k].y, x2: group[k + 1].x, y2: group[k + 1].y });
            }
        }
    }

    return { nodes, rowEdges, colEdges };
}

function buildFeatureIdMap(features: Feature[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const f of features) {
        if (f.type === "labeled_point") {
            const lp = f as LabeledPointFeature;
            map.set(`${lp.gridIndex.i}:${lp.gridIndex.j}`, lp.id);
        }
    }
    return map;
}

export default function PuzzleboardOverlay({
    result,
    zoom,
    toggles,
    onSelectFeature,
    features,
}: PuzzleboardOverlayProps) {
    const data = result as PuzzleBoardDetectResult;

    const { nodes, rowEdges, colEdges } = useMemo(
        () => buildPuzzleGrid(data.detection.corners),
        [data],
    );
    const featureIdMap = useMemo(
        () => buildFeatureIdMap(features ?? []),
        [features],
    );
    const edgeMarkers = useMemo(
        () => buildEdgeMarkers(data.observed_edges, data.detection.corners, data.alignment),
        [data],
    );

    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const labelPad = 2 / zoom;
    const hitRadius = 8 / zoom;
    const edgeStrokeWidth = Math.max(1.2, 1.6 / zoom);

    return (
        <Group>
            {toggles.edges && (
                <GridEdgesGroup
                    rowEdges={rowEdges}
                    colEdges={colEdges}
                    zoom={zoom}
                />
            )}

            <Group listening={false}>
                {edgeMarkers.map((m) => (
                    <Circle
                        key={m.key}
                        x={m.x}
                        y={m.y}
                        radius={m.radius}
                        stroke={m.stroke}
                        strokeWidth={edgeStrokeWidth}
                        opacity={m.opacity}
                    />
                ))}
            </Group>

            <Group>
                {Array.from(nodes.values()).map((node) => {
                    const key = `${node.i}:${node.j}`;
                    const featureId = featureIdMap.get(key);
                    return (
                        <Group key={`node-${key}`}>
                            {featureId && onSelectFeature && (
                                <Circle
                                    x={node.x}
                                    y={node.y}
                                    radius={hitRadius}
                                    fill="transparent"
                                    onClick={() => onSelectFeature(featureId)}
                                    onTap={() => onSelectFeature(featureId)}
                                />
                            )}
                            {showLabels && (
                                <Label
                                    x={node.x + 4 / zoom}
                                    y={node.y - fontSize - 2 / zoom}
                                    listening={false}
                                >
                                    <Tag fill={overlayTheme.labelBg} cornerRadius={2 / zoom} />
                                    <Text
                                        text={`(${node.i},${node.j})`}
                                        fontSize={fontSize}
                                        fill={overlayTheme.labelText}
                                        padding={labelPad}
                                    />
                                </Label>
                            )}
                        </Group>
                    );
                })}
            </Group>
        </Group>
    );
}
