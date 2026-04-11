import { Circle, Group, Text } from "react-konva";

import type { RadsymResult } from "../../../../lib/types";
import type { Feature, OverlayToggles } from "../../../../store/editor/useEditorStore";

interface RadsymOverlayProps {
    result: unknown;
    zoom: number;
    toggles: OverlayToggles;
    onSelectFeature?: (featureId: string) => void;
    features?: Feature[];
}

const RADIUS_COLOR = "rgba(59, 130, 246, 0.6)";

export default function RadsymOverlay({ result, zoom, toggles, onSelectFeature }: RadsymOverlayProps) {
    const r = result as RadsymResult;
    if (!r.circles || r.circles.length === 0) return null;

    const showLabels = toggles.labels && zoom >= 0.3;
    const strokeWidth = 1.2 / zoom;
    const fontSize = 10 / zoom;
    const hitRadius = 8 / zoom;

    return (
        <Group>
            {toggles.edges && r.circles.map((circle) => (
                <Group key={circle.id}>
                    {/* Radius circle outline */}
                    <Circle
                        x={circle.x + 0.5}
                        y={circle.y + 0.5}
                        radius={circle.radius}
                        stroke={RADIUS_COLOR}
                        strokeWidth={strokeWidth}
                        dash={[4 / zoom, 3 / zoom]}
                        listening={false}
                    />
                    {/* Hit area for click-to-select */}
                    {onSelectFeature && (
                        <Circle
                            x={circle.x + 0.5}
                            y={circle.y + 0.5}
                            radius={Math.max(hitRadius, circle.radius)}
                            fill="transparent"
                            onClick={() => onSelectFeature(circle.id)}
                            onTap={() => onSelectFeature(circle.id)}
                        />
                    )}
                </Group>
            ))}
            {showLabels && r.circles.map((circle) => (
                <Text
                    key={`label-${circle.id}`}
                    x={circle.x + circle.radius / zoom + 4 / zoom}
                    y={circle.y - fontSize / 2}
                    text={`r=${circle.radius.toFixed(1)}`}
                    fontSize={fontSize}
                    fill="#e2e8f0"
                    padding={2 / zoom}
                    listening={false}
                />
            ))}
        </Group>
    );
}
