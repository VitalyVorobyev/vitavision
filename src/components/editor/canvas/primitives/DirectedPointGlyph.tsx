import { Circle, Group, Line } from "react-konva";
import type Konva from "konva";

import type { DirectedPointFeature } from "../../../../store/editor/useEditorStore";

const ARROW_LENGTH_PX = 20;

const scoreColor = (score: number, selected: boolean, hovered: boolean): string => {
    if (selected) return "#f97316";
    if (hovered) return "#38bdf8";

    if (score >= 0.66) return "#22c55e";
    if (score >= 0.33) return "#f59e0b";
    return "#ef4444";
};

interface DirectedPointGlyphProps {
    feature: DirectedPointFeature;
    zoom: number;
    selected: boolean;
    hovered: boolean;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onHover: (feature: DirectedPointFeature, event: Konva.KonvaEventObject<MouseEvent>) => void;
    onHoverEnd: () => void;
}

export default function DirectedPointGlyph(props: DirectedPointGlyphProps) {
    const { feature, zoom, selected, hovered, onSelect, onHover, onHoverEnd } = props;
    const color = scoreColor(feature.score, selected, hovered);
    const arrowX = feature.x + feature.direction.dx * ARROW_LENGTH_PX;
    const arrowY = feature.y + feature.direction.dy * ARROW_LENGTH_PX;

    return (
        <Group>
            <Line
                points={[feature.x, feature.y, arrowX, arrowY]}
                stroke={color}
                strokeWidth={selected ? 2.4 / zoom : 1.4 / zoom}
                opacity={selected ? 1 : 0.85}
                listening={false}
            />
            <Circle
                x={feature.x}
                y={feature.y}
                radius={(selected ? 4.5 : 3.2) / zoom}
                fill={color}
                opacity={selected ? 0.95 : 0.85}
                onClick={(event) => onSelect(event)}
                onTap={(event) => onSelect(event)}
                onMouseEnter={(event) => onHover(feature, event)}
                onMouseMove={(event) => onHover(feature, event)}
                onMouseLeave={onHoverEnd}
            />
        </Group>
    );
}
