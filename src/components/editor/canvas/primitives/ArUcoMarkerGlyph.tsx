import { Circle, Group, Line } from "react-konva";
import type Konva from "konva";

import type { ArUcoMarkerFeature } from "../../../../store/editor/useEditorStore";
import { withAlpha, type CanvasTokens } from "../../../../lib/canvasTokens";
import { DETECTION_COLORS } from "../../../../store/editor/featureColors";

interface ArUcoMarkerGlyphProps {
    feature: ArUcoMarkerFeature;
    zoom: number;
    selected: boolean;
    /** The canvas palette (the image well's tokens), from the layer. */
    tokens: CanvasTokens;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export default function ArUcoMarkerGlyph({ feature, zoom, selected, tokens, onSelect }: ArUcoMarkerGlyphProps) {
    const fill = selected ? withAlpha(tokens.signal, 0.25) : withAlpha(DETECTION_COLORS.markerTint, 0.18);
    const stroke = selected ? tokens.signal : DETECTION_COLORS.marker;
    const strokeWidth = (selected ? 2.4 : 1.6) / zoom;
    const centerRadius = 2.5 / zoom;

    const hitRadius = 14 / zoom;

    return (
        <Group onClick={onSelect} onTap={onSelect}>
            {/* Invisible enlarged hit area for easier clicking */}
            <Circle
                x={feature.x}
                y={feature.y}
                radius={hitRadius}
                fill="transparent"
            />
            <Line
                points={[...feature.corners]}
                closed
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={0.9}
            />
            <Circle
                x={feature.x}
                y={feature.y}
                radius={centerRadius}
                fill={selected ? tokens.signal : tokens.fg}
                opacity={0.95}
            />
        </Group>
    );
}
