import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { PuzzleBoardDetectResult } from "../../../../lib/types";
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

    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const labelPad = 2 / zoom;
    const hitRadius = 8 / zoom;

    return (
        <Group>
            {toggles.edges && (
                <GridEdgesGroup
                    rowEdges={rowEdges}
                    colEdges={colEdges}
                    zoom={zoom}
                />
            )}

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
