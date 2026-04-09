import { Circle, Group } from "react-konva";
import type Konva from "konva";

import type { CircleFeature } from "../../../../store/editor/useEditorStore";

const scoreColor = (score: number | undefined, selected: boolean): string => {
    if (selected) return "#f97316";
    if (score === undefined) return "#3b82f6";
    if (score >= 0.66) return "#22c55e";
    if (score >= 0.33) return "#f59e0b";
    return "#ef4444";
};

interface CircleGlyphProps {
    feature: CircleFeature;
    zoom: number;
    selected: boolean;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export default function CircleGlyph({ feature, zoom, selected, onSelect }: CircleGlyphProps) {
    const color = scoreColor(feature.score, selected);
    const strokeWidth = (selected ? 2.4 : 1.4) / zoom;

    return (
        <Group>
            {/* Halo for contrast on dark images */}
            <Circle
                x={feature.x}
                y={feature.y}
                radius={feature.radius}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={(strokeWidth + 2 / zoom)}
                listening={false}
            />
            {/* Main circle outline at detected radius */}
            <Circle
                x={feature.x}
                y={feature.y}
                radius={feature.radius}
                stroke={color}
                strokeWidth={strokeWidth}
                onClick={onSelect}
                onTap={onSelect}
            />
            {/* Center dot */}
            <Circle
                x={feature.x}
                y={feature.y}
                radius={2.5 / zoom}
                fill={color}
                listening={false}
            />
            {/* Selection highlight ring */}
            {selected && (
                <Circle
                    x={feature.x}
                    y={feature.y}
                    radius={feature.radius + 4 / zoom}
                    stroke="#00ffff"
                    strokeWidth={1 / zoom}
                    dash={[4 / zoom, 3 / zoom]}
                    listening={false}
                />
            )}
        </Group>
    );
}
