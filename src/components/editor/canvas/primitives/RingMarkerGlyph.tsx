import { Circle, Ellipse, Group } from "react-konva";
import type Konva from "konva";

import type { RingMarkerFeature } from "../../../../store/editor/useEditorStore";

/* Original ringgrid palette — independent of overlayTheme so grid-overlay
   color changes don't affect ring marker rendering. */
const RING_OUTER = "#0f766e";
const RING_INNER = "#b45309";
const RING_HALO = "rgba(15, 23, 42, 0.82)";
const RING_CENTER_FILL = "#f8fafc";
const RING_CENTER_ACCENT = "#0f766e";

interface RingMarkerGlyphProps {
    feature: RingMarkerFeature;
    zoom: number;
    selected: boolean;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export default function RingMarkerGlyph({ feature, zoom, selected, onSelect }: RingMarkerGlyphProps) {
    const strokeWidth = 1.6 / zoom;
    const haloWidth = 3.2 / zoom;
    const centerRadius = 3.5 / zoom;

    const outerColor = selected ? "#00ffff" : RING_OUTER;
    const innerColor = selected ? "#00ffff" : RING_INNER;
    const haloColor = selected ? "rgba(0, 255, 255, 0.35)" : RING_HALO;
    const centerFill = selected ? "#00ffff" : RING_CENTER_FILL;
    const centerAccent = selected ? "#00bfbf" : RING_CENTER_ACCENT;

    const { outerEllipse: oe, innerEllipse: ie } = feature;

    return (
        <Group onClick={onSelect} onTap={onSelect}>
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
