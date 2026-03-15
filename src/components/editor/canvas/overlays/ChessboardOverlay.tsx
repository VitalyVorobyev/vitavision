import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { buildCornerGrid, buildGridEdges } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";

interface ChessboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
}

const CORNER_COLOR = "#0f766e";
const LABEL_BG = "rgba(0,0,0,0.55)";
const LABEL_MIN_ZOOM = 0.5;

export default function ChessboardOverlay({ result, zoom, toggles }: ChessboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);

    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const cornerRadius = 3 / zoom;
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

            {toggles.corners && (
                <Group>
                    {Array.from(grid.nodes.values()).map((node) => (
                        <Circle
                            key={`corner-${node.i}-${node.j}`}
                            x={node.x}
                            y={node.y}
                            radius={cornerRadius}
                            fill={CORNER_COLOR}
                            opacity={0.85}
                        />
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
                            <Tag fill={LABEL_BG} cornerRadius={2 / zoom} />
                            <Text
                                text={`${node.i},${node.j}`}
                                fontSize={fontSize}
                                fill="#e2e8f0"
                                padding={labelPad}
                            />
                        </Label>
                    ))}
                </Group>
            )}
        </Group>
    );
}
