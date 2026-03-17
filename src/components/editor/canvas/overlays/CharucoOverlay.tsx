import { useMemo } from "react";
import { Circle, Group, Label, Line, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import { isFeatureGroupVisible } from "../../../../store/editor/featureGroups";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { buildCornerGrid, buildGridEdges, buildMarkerPolygons } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface CharucoOverlayProps {
    result: unknown;
    zoom: number;
    showFeatures: boolean;
    featureGroupVisibility: Record<string, boolean>;
    toggles: OverlayToggles;
}

const LABEL_MIN_ZOOM = 0.5;

export default function CharucoOverlay({
    result,
    zoom,
    showFeatures,
    featureGroupVisibility,
    toggles,
}: CharucoOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);
    const markerPolygons = useMemo(
        () => buildMarkerPolygons(data.markers ?? []),
        [data],
    );

    const cornersVisible = showFeatures && isFeatureGroupVisible("algo:charuco", featureGroupVisibility);
    const markersVisible = showFeatures && isFeatureGroupVisible("algo:marker", featureGroupVisibility);
    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const cornerRadius = 4.5 / zoom;
    const labelPad = 2 / zoom;

    return (
        <Group listening={false}>
            {toggles.edges && (
                <GridEdgesGroup
                    rowEdges={edges.rowEdges}
                    colEdges={edges.colEdges}
                    zoom={zoom}
                />
            )}

            {markersVisible && (
                <Group>
                    {markerPolygons.map((m) => (
                        <Group key={`marker-${m.id}`}>
                            <Line
                                points={m.points}
                                closed
                                fill={overlayTheme.markerFill}
                                stroke={overlayTheme.markerStroke}
                                strokeWidth={1.6 / zoom}
                                opacity={0.9}
                            />
                            {showLabels && (
                                <Label
                                    x={m.center.x + 2 / zoom}
                                    y={m.center.y - fontSize / 2}
                                >
                                    <Tag fill={overlayTheme.labelBg} cornerRadius={2 / zoom} />
                                    <Text
                                        text={`#${m.id}`}
                                        fontSize={fontSize}
                                        fill={overlayTheme.markerLabel}
                                        padding={labelPad}
                                    />
                                </Label>
                            )}
                        </Group>
                    ))}
                </Group>
            )}

            {cornersVisible && (
                <Group>
                    {Array.from(grid.nodes.values()).map((node) => (
                        <Group key={`corner-${node.i}-${node.j}`}>
                            <Circle
                                x={node.x}
                                y={node.y}
                                radius={cornerRadius}
                                fill={overlayTheme.cornerHalo}
                                opacity={0.88}
                            />
                            <Circle
                                x={node.x}
                                y={node.y}
                                radius={cornerRadius * 0.66}
                                fill={overlayTheme.cornerFill}
                                opacity={0.98}
                            />
                            <Circle
                                x={node.x}
                                y={node.y}
                                radius={cornerRadius * 0.28}
                                fill={overlayTheme.cornerAccent}
                                opacity={0.95}
                            />
                        </Group>
                    ))}
                </Group>
            )}

            {showLabels && cornersVisible && (
                <Group>
                    {Array.from(grid.nodes.values()).map((node) => (
                        <Label
                            key={`label-${node.i}-${node.j}`}
                            x={node.x + 4 / zoom}
                            y={node.y - fontSize - 2 / zoom}
                        >
                            <Tag fill={overlayTheme.labelBg} cornerRadius={2 / zoom} />
                            <Text
                                text={`${node.i},${node.j}`}
                                fontSize={fontSize}
                                fill={overlayTheme.labelText}
                                padding={labelPad}
                            />
                        </Label>
                    ))}
                </Group>
            )}
        </Group>
    );
}
