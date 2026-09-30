import { Circle, Group, Line } from "react-konva";
import type Konva from "konva";

import { scoreTone, type CanvasTokens } from "../../../../lib/canvasTokens";
import type { DirectedPointFeature } from "../../../../store/editor/useEditorStore";

const ARROW_LENGTH_PX = 20;

const scoreColor = (tokens: CanvasTokens, score: number, selected: boolean, hovered: boolean): string => {
    if (selected) return tokens.signal;
    if (hovered) return tokens.signalStrong;
    return tokens[scoreTone(score)];
};

interface DirectedPointGlyphProps {
    feature: DirectedPointFeature;
    zoom: number;
    selected: boolean;
    hovered: boolean;
    /** The canvas palette (the image well's tokens), from the layer. */
    tokens: CanvasTokens;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onHover: (feature: DirectedPointFeature, event: Konva.KonvaEventObject<MouseEvent>) => void;
    onHoverEnd: () => void;
}

export default function DirectedPointGlyph(props: DirectedPointGlyphProps) {
    const { feature, zoom, selected, hovered, tokens, onSelect, onHover, onHoverEnd } = props;
    const color = scoreColor(tokens, feature.score, selected, hovered);
    const strokeWidth = selected ? 2.4 / zoom : 1.4 / zoom;
    const opacity = selected ? 1 : 0.85;

    return (
        <Group>
            {feature.axes.map((axis, i) => (
                <Line
                    key={i}
                    points={[
                        feature.x - axis.dx * ARROW_LENGTH_PX,
                        feature.y - axis.dy * ARROW_LENGTH_PX,
                        feature.x + axis.dx * ARROW_LENGTH_PX,
                        feature.y + axis.dy * ARROW_LENGTH_PX,
                    ]}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    listening={false}
                />
            ))}
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
