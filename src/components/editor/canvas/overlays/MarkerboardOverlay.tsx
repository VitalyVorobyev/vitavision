import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/types";
import type { Feature, OverlayToggles } from "../../../../store/editor/useEditorStore";
import { toCanvasCoordinate } from "../../algorithms/calibrationTargets/shared";
import { buildCornerGrid, buildGridEdges, buildFeatureIdByGrid } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface MarkerboardOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
    onSelectFeature?: (featureId: string) => void;
    features?: Feature[];
}

const LABEL_MIN_ZOOM = 0.5;

export default function MarkerboardOverlay({
    result,
    zoom,
    toggles,
    onSelectFeature,
    features,
}: MarkerboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);
    const featureIdMap = useMemo(
        () => buildFeatureIdByGrid(features ?? []),
        [features],
    );

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

            {toggles.edges && (
                <Group>
                    {matchedCircles.map((c, i) => {
                        const cx = toCanvasCoordinate(c.center_img.x);
                        const cy = toCanvasCoordinate(c.center_img.y);
                        const color = c.polarity === "white" ? overlayTheme.circleLight : overlayTheme.circleDark;
                        const circleKey = `${c.expectedCell.i}:${c.expectedCell.j}`;
                        const featureId = featureIdMap.get(circleKey);
                        return (
                            <Group key={`circle-${i}`}>
                                <Circle
                                    x={cx}
                                    y={cy}
                                    radius={circleRadius}
                                    stroke={overlayTheme.cornerHalo}
                                    strokeWidth={3.2 / zoom}
                                    opacity={0.75}
                                    listening={false}
                                />
                                <Circle
                                    x={cx}
                                    y={cy}
                                    radius={circleRadius}
                                    stroke={color}
                                    fill="rgba(248, 250, 252, 0.06)"
                                    strokeWidth={1.6 / zoom}
                                    opacity={0.95}
                                    listening={false}
                                />
                                {/* Hit area for click-to-select */}
                                {featureId && onSelectFeature && (
                                    <Circle
                                        x={cx}
                                        y={cy}
                                        radius={hitRadius}
                                        fill="transparent"
                                        onClick={() => onSelectFeature(featureId)}
                                        onTap={() => onSelectFeature(featureId)}
                                    />
                                )}
                                {showLabels && (
                                    <Label
                                        x={cx + circleRadius + 2 / zoom}
                                        y={cy - fontSize / 2}
                                        listening={false}
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

            <Group>
                {Array.from(grid.nodes.values()).map((node) => {
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
