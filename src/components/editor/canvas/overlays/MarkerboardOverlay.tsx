import { useMemo } from "react";
import { Circle, Group, Label, Tag, Text } from "react-konva";

import type { CalibrationTargetResult } from "../../../../lib/api";
import { isFeatureGroupVisible } from "../../../../store/editor/featureGroups";
import type { OverlayToggles } from "../../../../store/editor/useEditorStore";
import { toCanvasCoordinate } from "../../algorithms/calibrationTargets/shared";
import { buildCornerGrid, buildGridEdges } from "../../algorithms/calibrationTargets/overlayData";
import GridEdgesGroup from "./GridEdgesGroup";
import { overlayTheme } from "./overlayTheme";

interface MarkerboardOverlayProps {
    result: unknown;
    zoom: number;
    showFeatures: boolean;
    featureGroupVisibility: Record<string, boolean>;
    toggles: OverlayToggles;
}

const LABEL_MIN_ZOOM = 0.5;

export default function MarkerboardOverlay({
    result,
    zoom,
    showFeatures,
    featureGroupVisibility,
    toggles,
}: MarkerboardOverlayProps) {
    const data = result as CalibrationTargetResult;

    const grid = useMemo(() => buildCornerGrid(data.detection.corners), [data]);
    const edges = useMemo(() => buildGridEdges(grid), [grid]);

    const candidates = data.circle_candidates ?? [];
    const cornersVisible = showFeatures && isFeatureGroupVisible("algo:checkerboard_marker", featureGroupVisibility);
    const circlesVisible = showFeatures && isFeatureGroupVisible("algo:circle_candidate", featureGroupVisibility);
    const showLabels = toggles.labels && zoom >= LABEL_MIN_ZOOM;
    const fontSize = 10 / zoom;
    const cornerRadius = 4.5 / zoom;
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

            {circlesVisible && (
                <Group>
                    {candidates.map((c, i) => {
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
                                            text={`${c.cell.i},${c.cell.j}`}
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
