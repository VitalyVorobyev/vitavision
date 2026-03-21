import { Circle, Group, Line } from "react-konva";
import type Konva from "konva";

import type { ArUcoMarkerFeature } from "../../../../store/editor/useEditorStore";
import { overlayTheme } from "../overlays/overlayTheme";

interface ArUcoMarkerGlyphProps {
    feature: ArUcoMarkerFeature;
    zoom: number;
    selected: boolean;
    onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export default function ArUcoMarkerGlyph({ feature, zoom, selected, onSelect }: ArUcoMarkerGlyphProps) {
    const fill = selected ? "rgba(0, 255, 255, 0.25)" : overlayTheme.markerFill;
    const stroke = selected ? "#00ffff" : overlayTheme.markerStroke;
    const strokeWidth = (selected ? 2.4 : 1.6) / zoom;
    const centerRadius = 2.5 / zoom;

    return (
        <Group onClick={onSelect} onTap={onSelect}>
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
                fill={selected ? "#00ffff" : overlayTheme.cornerFill}
                opacity={0.95}
            />
        </Group>
    );
}
