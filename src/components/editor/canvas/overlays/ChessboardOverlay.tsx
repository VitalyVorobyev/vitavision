import { useMemo } from "react";
import { Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { buildCornerGrid, buildGridEdges } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface ChessboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
}

const LABEL_MIN_ZOOM = 0.5;

export default function ChessboardOverlay({
    result,
    zoom,
    toggles,
}: ChessboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);

    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
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
