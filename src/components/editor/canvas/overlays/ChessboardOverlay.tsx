import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/types";
import type { Feature, OverlayToggles } from "../../../../store/editor/useEditorStore";
import { buildCornerGrid, buildGridEdges, buildFeatureIdByGrid } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface ChessboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
    onSelectFeature?: (featureId: string) => void;
    features?: Feature[];
}

const LABEL_MIN_ZOOM = 0.5;

export default function ChessboardOverlay({
    result,
    zoom,
    toggles,
    onSelectFeature,
    features,
}: ChessboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);
    const featureIdMap = useMemo(
        () => buildFeatureIdByGrid(features ?? []),
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
                    rowEdges={edges.rowEdges}
                    colEdges={edges.colEdges}
                    zoom={zoom}
                />
            )}

            <Group>
                {Array.from(grid.nodes.values()).map((node) => {
                    const key = `${node.i}:${node.j}`;
                    const featureId = featureIdMap.get(key);
                    return (
                        <Group key={`node-${key}`}>
                            {/* Invisible hit area for click-to-select */}
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
                                        text={`${node.i},${node.j}`}
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
