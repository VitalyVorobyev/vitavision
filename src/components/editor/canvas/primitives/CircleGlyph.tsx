import { Circle, Group } from "react-konva";
import type Konva from "konva";

import { scoreTone, withAlpha, type CanvasTokens } from "../../../../lib/canvasTokens";
import type { CircleFeature } from "../../../../store/editor/useEditorStore";

const scoreColor = (tokens: CanvasTokens, score: number | undefined, selected: boolean): string => {
    if (selected) return tokens.signal;
    if (score === undefined) return tokens.fg;
    return tokens[scoreTone(score)];
};

interface CircleGlyphProps {
    feature: CircleFeature;
    zoom: number;
    selected: boolean;
    /** The canvas palette (the image well's tokens), from the layer. */
    tokens: CanvasTokens;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export default function CircleGlyph({ feature, zoom, selected, tokens, onSelect }: CircleGlyphProps) {
    const color = scoreColor(tokens, feature.score, selected);
    const strokeWidth = (selected ? 2.4 : 1.4) / zoom;

    return (
        <Group>
            {/* Halo for contrast on dark images */}
            <Circle
                x={feature.x}
                y={feature.y}
                radius={feature.radius}
                stroke={withAlpha(tokens.canvas, 0.4)}
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
                    stroke={tokens.signal}
                    strokeWidth={1 / zoom}
                    dash={[4 / zoom, 3 / zoom]}
                    listening={false}
                />
            )}
        </Group>
    );
}
