import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import { isFeatureGroupVisible } from "../../../../store/editor/featureGroups";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { buildCornerGrid, buildGridEdges } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface ChessboardOverlayProps {
    result: unknown;
    zoom: number;
    showFeatures: boolean;
    featureGroupVisibility: Record<string, boolean>;
    toggles: OverlayToggles;
}

const LABEL_MIN_ZOOM = 0.5;

export default function ChessboardOverlay({
    result,
    zoom,
    showFeatures,
    featureGroupVisibility,
    toggles,
}: ChessboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);

    const cornersVisible = showFeatures && isFeatureGroupVisible("algo:chessboard", featureGroupVisibility);
    const showLabels = toggles.labels && cornersVisible && zoom >= LABEL_MIN_ZOOM;
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

            {showLabels && (
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
