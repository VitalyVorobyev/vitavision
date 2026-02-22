import { Circle, Ellipse, Line, Rect } from "react-konva";
import type Konva from "konva";

import DirectedPointGlyph from "./primitives/DirectedPointGlyph";
import { isReadonlyFeature, type DirectedPointFeature, type Feature, type ToolType } from "../../../store/editor/useEditorStore";

interface FeatureLayerProps {
    features: Feature[];
    showFeatures: boolean;
    zoom: number;
    activeTool: ToolType;
    selectedFeatureId: string | null;
    hoveredDirectedPointId: string | null;
    setSelectedFeatureId: (id: string) => void;
    updateFeature: (id: string, partial: Partial<Feature>) => void;
    onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
    onDirectedPointHover: (feature: DirectedPointFeature, event: Konva.KonvaEventObject<MouseEvent>) => void;
    onDirectedPointLeave: () => void;
}

export default function FeatureLayer(props: FeatureLayerProps) {
    const {
        features,
        showFeatures,
        zoom,
        activeTool,
        selectedFeatureId,
        hoveredDirectedPointId,
        setSelectedFeatureId,
        updateFeature,
        onTransformEnd,
        onDirectedPointHover,
        onDirectedPointLeave,
    } = props;

    if (!showFeatures) {
        return null;
    }

    return (
        <>
            {features.map((feature) => {
                const isSelected = selectedFeatureId === feature.id;
                const isReadonly = isReadonlyFeature(feature);
                const canEditGeometry = activeTool === "SELECT" && !isReadonly;

                if (feature.type === "point") {
                    return (
                        <Circle
                            key={feature.id}
                            x={feature.x}
                            y={feature.y}
                            radius={3 / zoom}
                            fill={isSelected ? "#00ffff" : feature.color || "#ff0000"}
                            draggable={canEditGeometry}
                            onDragEnd={(event) => {
                                updateFeature(feature.id, { x: event.target.x(), y: event.target.y() });
                            }}
                            onClick={() => setSelectedFeatureId(feature.id)}
                            onTap={() => setSelectedFeatureId(feature.id)}
                        />
                    );
                }

                if (feature.type === "line") {
                    return (
                        <Line
                            key={feature.id}
                            points={feature.points}
                            stroke={isSelected ? "#00ffff" : feature.color || "#00ffff"}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={() => setSelectedFeatureId(feature.id)}
                            onTap={() => setSelectedFeatureId(feature.id)}
                        />
                    );
                }

                if (feature.type === "polyline") {
                    return (
                        <Line
                            key={feature.id}
                            points={feature.points}
                            stroke={isSelected ? "#00ffff" : feature.color || "#00ff00"}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={() => setSelectedFeatureId(feature.id)}
                            onTap={() => setSelectedFeatureId(feature.id)}
                        />
                    );
                }

                if (feature.type === "bbox") {
                    return (
                        <Rect
                            key={feature.id}
                            id={`transformable-${feature.id}`}
                            x={feature.x}
                            y={feature.y}
                            width={feature.width}
                            height={feature.height}
                            rotation={feature.rotation || 0}
                            stroke={feature.color || "#ffaa00"}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={() => setSelectedFeatureId(feature.id)}
                            onTap={() => setSelectedFeatureId(feature.id)}
                            onDragEnd={(event) => {
                                updateFeature(feature.id, { x: event.target.x(), y: event.target.y() });
                            }}
                            onTransformEnd={onTransformEnd}
                        />
                    );
                }

                if (feature.type === "ellipse") {
                    return (
                        <Ellipse
                            key={feature.id}
                            id={`transformable-${feature.id}`}
                            x={feature.x}
                            y={feature.y}
                            radiusX={feature.radiusX}
                            radiusY={feature.radiusY}
                            rotation={feature.rotation || 0}
                            stroke={feature.color || "#ff00ff"}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={() => setSelectedFeatureId(feature.id)}
                            onTap={() => setSelectedFeatureId(feature.id)}
                            onDragEnd={(event) => {
                                updateFeature(feature.id, { x: event.target.x(), y: event.target.y() });
                            }}
                            onTransformEnd={onTransformEnd}
                        />
                    );
                }

                if (feature.type === "directed_point") {
                    return (
                        <DirectedPointGlyph
                            key={feature.id}
                            feature={feature}
                            zoom={zoom}
                            selected={isSelected}
                            hovered={hoveredDirectedPointId === feature.id}
                            onSelect={() => setSelectedFeatureId(feature.id)}
                            onHover={onDirectedPointHover}
                            onHoverEnd={onDirectedPointLeave}
                        />
                    );
                }

                return null;
            })}
        </>
    );
}
