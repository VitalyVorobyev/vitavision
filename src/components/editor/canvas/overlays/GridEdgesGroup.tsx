import { Group, Line } from "react-konva";

import type { GridEdge } from "../../algorithms/calibrationTargets/overlayData";

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
    rowColor = "#2dd4bf",
    colColor = "#60a5fa",
}: GridEdgesGroupProps) {
    const strokeWidth = 1.2 / zoom;

    return (
        <Group listening={false}>
            {rowEdges.map((e, i) => (
                <Line
                    key={`r-${i}`}
                    points={[e.x1, e.y1, e.x2, e.y2]}
                    stroke={rowColor}
                    strokeWidth={strokeWidth}
                    opacity={0.7}
                />
            ))}
            {colEdges.map((e, i) => (
                <Line
                    key={`c-${i}`}
                    points={[e.x1, e.y1, e.x2, e.y2]}
                    stroke={colColor}
                    strokeWidth={strokeWidth}
                    opacity={0.7}
                />
            ))}
        </Group>
    );
}
