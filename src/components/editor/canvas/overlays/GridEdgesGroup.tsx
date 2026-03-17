import { Group, Line } from "react-konva";

import type { GridEdge } from "../../algorithms/calibrationTargets/overlayData";
import { overlayTheme } from "./overlayTheme";

interface GridEdgesGroupProps {
    rowEdges: GridEdge[];
    colEdges: GridEdge[];
    zoom: number;
    rowColor?: string;
    colColor?: string;
}

export default function GridEdgesGroup({
    rowEdges,
    colEdges,
    zoom,
    rowColor = overlayTheme.rowEdge,
    colColor = overlayTheme.colEdge,
}: GridEdgesGroupProps) {
    const strokeWidth = 1.5 / zoom;
    const haloWidth = 3.2 / zoom;

    return (
        <Group listening={false}>
            {rowEdges.map((e, i) => (
                <Group key={`r-${i}`}>
                    <Line
                        points={[e.x1, e.y1, e.x2, e.y2]}
                        stroke={overlayTheme.edgeHalo}
                        strokeWidth={haloWidth}
                        opacity={0.72}
                    />
                    <Line
                        points={[e.x1, e.y1, e.x2, e.y2]}
                        stroke={rowColor}
                        strokeWidth={strokeWidth}
                        opacity={0.95}
                    />
                </Group>
            ))}
            {colEdges.map((e, i) => (
                <Group key={`c-${i}`}>
                    <Line
                        points={[e.x1, e.y1, e.x2, e.y2]}
                        stroke={overlayTheme.edgeHalo}
                        strokeWidth={haloWidth}
                        opacity={0.72}
                    />
                    <Line
                        points={[e.x1, e.y1, e.x2, e.y2]}
                        stroke={colColor}
                        strokeWidth={strokeWidth}
                        opacity={0.95}
                    />
                </Group>
            ))}
        </Group>
    );
}
