import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { toCanvasCoordinate } from "../../algorithms/calibrationTargets/shared";
import { buildCornerGrid, buildGridEdges } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";

interface MarkerboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
}

const CORNER_COLOR = "#0f766e";
const WHITE_CIRCLE_COLOR = "#e2e8f0";
const BLACK_CIRCLE_COLOR = "#1e293b";
const LABEL_BG = "rgba(0,0,0,0.55)";
const LABEL_MIN_ZOOM = 0.5;

export default function MarkerboardOverlay({ result, zoom, toggles }: MarkerboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);

    const candidates = data.circle_candidates ?? [];
    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const cornerRadius = 3 / zoom;
    const circleRadius = 5 / zoom;
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

            {toggles.markers && (
                <Group>
                    {candidates.map((c, i) => {
                        const cx = toCanvasCoordinate(c.center_img.x);
                        const cy = toCanvasCoordinate(c.center_img.y);
                        const color = c.polarity === "white" ? WHITE_CIRCLE_COLOR : BLACK_CIRCLE_COLOR;
                        return (
                            <Group key={`circle-${i}`}>
                                <Circle
                                    x={cx}
                                    y={cy}
                                    radius={circleRadius}
                                    stroke={color}
                                    strokeWidth={1.5 / zoom}
                                    opacity={0.85}
                                />
                                {showLabels && (
                                    <Label
                                        x={cx + circleRadius + 2 / zoom}
                                        y={cy - fontSize / 2}
                                    >
                                        <Tag fill={LABEL_BG} cornerRadius={2 / zoom} />
                                        <Text
                                            text={`${c.cell.i},${c.cell.j}`}
                                            fontSize={fontSize}
                                            fill="#e2e8f0"
                                            padding={labelPad}
                                        />
                                    </Label>
                                )}
                            </Group>
                        );
                    })}
                </Group>
            )}

            {showLabels && toggles.corners && (
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
