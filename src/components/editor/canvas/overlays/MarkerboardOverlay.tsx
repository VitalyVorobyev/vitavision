import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { toCanvasCoordinate } from "../../algorithms/calibrationTargets/shared";
import { buildCornerGrid, buildGridEdges } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface MarkerboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
}

const LABEL_MIN_ZOOM = 0.5;

export default function MarkerboardOverlay({
    result,
    zoom,
    toggles,
}: MarkerboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);

    const matchedCircles = useMemo(() => {
        const matches = data.circle_matches ?? [];
        const candidates = data.circle_candidates ?? [];
        return matches
            .filter((m) => m.matched_index !== null && m.matched_index! < candidates.length)
            .map((m) => ({
                ...candidates[m.matched_index!],
                expectedCell: m.expected.cell,
            }));
    }, [data]);

    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const circleRadius = 5.2 / zoom;
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

            {toggles.edges && (
                <Group>
                    {matchedCircles.map((c, i) => {
                        const cx = toCanvasCoordinate(c.center_img.x);
                        const cy = toCanvasCoordinate(c.center_img.y);
                        const color = c.polarity === "white" ? overlayTheme.circleLight : overlayTheme.circleDark;
                        return (
                            <Group key={`circle-${i}`}>
                                <Circle
                                    x={cx}
                                    y={cy}
                                    radius={circleRadius}
                                    stroke={overlayTheme.cornerHalo}
                                    strokeWidth={3.2 / zoom}
                                    opacity={0.75}
                                />
                                <Circle
                                    x={cx}
                                    y={cy}
                                    radius={circleRadius}
                                    stroke={color}
                                    fill="rgba(248, 250, 252, 0.06)"
                                    strokeWidth={1.6 / zoom}
                                    opacity={0.95}
                                />
                                {showLabels && (
                                    <Label
                                        x={cx + circleRadius + 2 / zoom}
                                        y={cy - fontSize / 2}
                                    >
                                        <Tag fill={overlayTheme.labelBg} cornerRadius={2 / zoom} />
                                        <Text
                                            text={`(${c.expectedCell.i}, ${c.expectedCell.j})`}
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
