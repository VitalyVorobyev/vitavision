import { Circle, Ellipse, Group } from "react-konva";
import type Konva from "konva";

import { withAlpha, type CanvasTokens } from "../../../../lib/canvasTokens";
import { RING_COLORS } from "../../../../store/editor/featureColors";
import type { RingMarkerFeature } from "../../../../store/editor/useEditorStore";

interface RingMarkerGlyphProps {
    feature: RingMarkerFeature;
    zoom: number;
    selected: boolean;
    /** The canvas palette (the image well's tokens), from the layer. */
    tokens: CanvasTokens;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export default function RingMarkerGlyph({ feature, zoom, selected, tokens, onSelect }: RingMarkerGlyphProps) {
    const strokeWidth = 1.6 / zoom;
    const haloWidth = 3.2 / zoom;
    const centerRadius = 3.5 / zoom;

    const outerColor = selected ? tokens.signal : RING_COLORS.outer;
    const innerColor = selected ? tokens.signal : RING_COLORS.inner;
    const haloColor = selected ? withAlpha(tokens.signal, 0.35) : withAlpha(tokens.canvas, 0.82);
    const centerFill = selected ? tokens.signal : RING_COLORS.center;
    const centerAccent = selected ? tokens.signalFg : RING_COLORS.centerAccent;

    const { outerEllipse: oe, innerEllipse: ie } = feature;

    return (
        <Group onClick={onSelect} onTap={onSelect}>
            {/* Invisible hit area — ensures click anywhere near marker selects it */}
            <Circle
                x={feature.x}
                y={feature.y}
                radius={Math.max(oe.a, ie.a)}
                fill="transparent"
            />
            {/* Outer ellipse halo */}
            <Ellipse
                x={oe.cx} y={oe.cy}
                radiusX={oe.a} radiusY={oe.b}
                rotation={oe.angleDeg}
                stroke={haloColor}
                strokeWidth={haloWidth}
                opacity={0.5}
            />
            {/* Outer ellipse */}
            <Ellipse
                x={oe.cx} y={oe.cy}
                radiusX={oe.a} radiusY={oe.b}
                rotation={oe.angleDeg}
                stroke={outerColor}
                strokeWidth={strokeWidth}
                opacity={0.9}
            />
            {/* Inner ellipse halo */}
            <Ellipse
                x={ie.cx} y={ie.cy}
                radiusX={ie.a} radiusY={ie.b}
                rotation={ie.angleDeg}
                stroke={haloColor}
                strokeWidth={haloWidth}
                opacity={0.5}
            />
            {/* Inner ellipse */}
            <Ellipse
                x={ie.cx} y={ie.cy}
                radiusX={ie.a} radiusY={ie.b}
                rotation={ie.angleDeg}
                stroke={innerColor}
                strokeWidth={strokeWidth}
                opacity={0.9}
            />
            {/* Center dot */}
            <Circle
                x={feature.x} y={feature.y}
                radius={centerRadius}
                fill={centerFill}
                opacity={0.95}
            />
            <Circle
                x={feature.x} y={feature.y}
                radius={centerRadius * 0.4}
                fill={centerAccent}
                opacity={0.95}
            />
        </Group>
    );
}
