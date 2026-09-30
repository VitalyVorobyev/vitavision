import { memo } from "react";
import { Circle, Ellipse, Group, Label, Line, Rect, Tag, Text } from "react-konva";
import type Konva from "konva";

import ArUcoMarkerGlyph from "./primitives/ArUcoMarkerGlyph";
import DirectedPointGlyph from "./primitives/DirectedPointGlyph";
import RingMarkerGlyph from "./primitives/RingMarkerGlyph";
import CircleGlyph from "./primitives/CircleGlyph";
import { isFeatureVisible } from "../../../store/editor/featureGroups";
import { useCanvasTokens, withAlpha } from "../../../lib/canvasTokens";
import { ANNOTATION_COLORS, DETECTION_COLORS } from "../../../store/editor/featureColors";
import { isReadonlyFeature, type DirectedPointFeature, type Feature, type OverlayToggles, type ToolType } from "../../../store/editor/useEditorStore";

interface FeatureLayerProps {
    features: Feature[];
    showFeatures: boolean;
    featureGroupVisibility: Record<string, boolean>;
    zoom: number;
    activeTool: ToolType;
    selectedFeatureId: string | null;
    hoveredDirectedPointId: string | null;
    overlayToggles?: OverlayToggles;
    setSelectedFeatureId: (id: string) => void;
    updateFeature: (id: string, partial: Partial<Feature>) => void;
    onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
    onDirectedPointHover: (feature: DirectedPointFeature, event: Konva.KonvaEventObject<MouseEvent>) => void;
    onDirectedPointLeave: () => void;
}

// Hoisted to module scope to avoid recreation every render.
// Render area features (markers, polygons) first, then point-like features on top.
// This ensures point hit areas are above marker fills so clicking near a corner
// selects the corner, not the underlying marker polygon.
const AREA_TYPES = new Set(["aruco_marker", "bbox", "ellipse", "polygon"]);

const LABEL_MIN_ZOOM = 0.5;

export default memo(function FeatureLayer(props: FeatureLayerProps) {
    const {
        features,
        showFeatures,
        featureGroupVisibility,
        zoom,
        activeTool,
        selectedFeatureId,
        hoveredDirectedPointId,
        overlayToggles,
        setSelectedFeatureId,
        updateFeature,
        onTransformEnd,
        onDirectedPointHover,
        onDirectedPointLeave,
    } = props;
    // Drawn on the photograph, so in the image well's palette (see canvasTokens.ts).
    const tokens = useCanvasTokens("well");

    if (!showFeatures) {
        return null;
    }

    const handleFeatureSelect = (featureId: string) => (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (event.evt instanceof MouseEvent && event.evt.button !== 0) {
            return;
        }

        setSelectedFeatureId(featureId);
    };
    const areaFeatures = features.filter((f) => AREA_TYPES.has(f.type));
    const pointFeatures = features.filter((f) => !AREA_TYPES.has(f.type));

    const renderFeature = (feature: Feature) => {
                const groupVisible = isFeatureVisible(feature, featureGroupVisibility);
                if (!groupVisible) {
                    return null;
                }

                const isSelected = selectedFeatureId === feature.id;
                const isReadonly = isReadonlyFeature(feature);
                const canEditGeometry = activeTool === "SELECT" && !isReadonly;
                const selectFeature = handleFeatureSelect(feature.id);

                if (feature.type === "point") {
                    const pointRadius = 3 / zoom;
                    const hitRadius = 8 / zoom;
                    const color = isSelected ? tokens.signal : feature.color || ANNOTATION_COLORS.point;
                    return (
                        <Group
                            key={feature.id}
                            draggable={canEditGeometry}
                            onDragEnd={(event) => {
                                const dx = event.target.x();
                                const dy = event.target.y();
                                updateFeature(feature.id, { x: feature.x + dx, y: feature.y + dy });
                                event.target.position({ x: 0, y: 0 });
                            }}
                            onClick={selectFeature}
                            onTap={selectFeature}
                        >
                            {/* Invisible hit area — expands clickable region */}
                            <Circle
                                x={feature.x}
                                y={feature.y}
                                radius={hitRadius}
                                fill="transparent"
                            />
                            {isSelected && (
                                <Circle
                                    x={feature.x}
                                    y={feature.y}
                                    radius={10 / zoom}
                                    fill={withAlpha(tokens.signal, 0.18)}
                                    stroke={tokens.signal}
                                    strokeWidth={1.2 / zoom}
                                    opacity={0.9}
                                />
                            )}
                            <Circle
                                x={feature.x}
                                y={feature.y}
                                radius={pointRadius}
                                fill={color}
                            />
                        </Group>
                    );
                }

                if (feature.type === "line") {
                    return (
                        <Line
                            key={feature.id}
                            points={feature.points}
                            stroke={isSelected ? tokens.signal : feature.color || ANNOTATION_COLORS.line}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={selectFeature}
                            onTap={selectFeature}
                            onDragEnd={(event) => {
                                const dx = event.target.x();
                                const dy = event.target.y();
                                event.target.position({ x: 0, y: 0 });
                                const points = feature.points.map((v, i) => v + (i % 2 === 0 ? dx : dy));
                                updateFeature(feature.id, { points });
                            }}
                        />
                    );
                }

                if (feature.type === "polyline") {
                    return (
                        <Line
                            key={feature.id}
                            points={feature.points}
                            stroke={isSelected ? tokens.signal : feature.color || ANNOTATION_COLORS.polyline}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={selectFeature}
                            onTap={selectFeature}
                            onDragEnd={(event) => {
                                const dx = event.target.x();
                                const dy = event.target.y();
                                event.target.position({ x: 0, y: 0 });
                                const points = feature.points.map((v, i) => v + (i % 2 === 0 ? dx : dy));
                                updateFeature(feature.id, { points });
                            }}
                        />
                    );
                }

                if (feature.type === "polygon") {
                    const fillColor = isSelected ? withAlpha(tokens.signal, 0.15) : withAlpha(ANNOTATION_COLORS.polygon, 0.15);
                    return (
                        <Line
                            key={feature.id}
                            points={feature.points}
                            closed={feature.closed}
                            fill={fillColor}
                            stroke={isSelected ? tokens.signal : feature.color || ANNOTATION_COLORS.polygon}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={selectFeature}
                            onTap={selectFeature}
                            onDragEnd={(event) => {
                                const dx = event.target.x();
                                const dy = event.target.y();
                                event.target.position({ x: 0, y: 0 });
                                const points = feature.points.map((v, i) => v + (i % 2 === 0 ? dx : dy));
                                updateFeature(feature.id, { points });
                            }}
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
                            stroke={feature.color || ANNOTATION_COLORS.bbox}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={selectFeature}
                            onTap={selectFeature}
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
                            stroke={feature.color || ANNOTATION_COLORS.ellipse}
                            strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                            draggable={canEditGeometry}
                            onClick={selectFeature}
                            onTap={selectFeature}
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
                            tokens={tokens}
                            feature={feature}
                            zoom={zoom}
                            selected={isSelected}
                            hovered={hoveredDirectedPointId === feature.id}
                            onSelect={selectFeature}
                            onHover={onDirectedPointHover}
                            onHoverEnd={onDirectedPointLeave}
                        />
                    );
                }

                if (feature.type === "ring_marker") {
                    return (
                        <RingMarkerGlyph
                            key={feature.id}
                            tokens={tokens}
                            feature={feature}
                            zoom={zoom}
                            selected={isSelected}
                            onSelect={selectFeature}
                        />
                    );
                }

                if (feature.type === "aruco_marker") {
                    return (
                        <ArUcoMarkerGlyph
                            key={feature.id}
                            tokens={tokens}
                            feature={feature}
                            zoom={zoom}
                            selected={isSelected}
                            onSelect={selectFeature}
                        />
                    );
                }

                if (feature.type === "circle") {
                    return (
                        <CircleGlyph
                            key={feature.id}
                            tokens={tokens}
                            feature={feature}
                            zoom={zoom}
                            selected={isSelected}
                            onSelect={selectFeature}
                        />
                    );
                }

                if (feature.type === "labeled_point") {
                    const lp = feature;
                    const pointRadius = 3 / zoom;
                    const hitRadius = 8 / zoom;
                    const color = isSelected ? tokens.signal : feature.color || DETECTION_COLORS.corner;
                    const showLabel = (overlayToggles?.labels ?? false) && zoom >= LABEL_MIN_ZOOM;
                    const fontSize = 9 / zoom;
                    const labelPad = 2 / zoom;
                    return (
                        <Group
                            key={feature.id}
                            onClick={selectFeature}
                            onTap={selectFeature}
                        >
                            <Circle
                                x={lp.x}
                                y={lp.y}
                                radius={hitRadius}
                                fill="transparent"
                            />
                            {isSelected && (
                                <Circle
                                    x={lp.x}
                                    y={lp.y}
                                    radius={10 / zoom}
                                    fill={withAlpha(tokens.signal, 0.18)}
                                    stroke={tokens.signal}
                                    strokeWidth={1.2 / zoom}
                                    opacity={0.9}
                                />
                            )}
                            <Circle
                                x={lp.x}
                                y={lp.y}
                                radius={pointRadius}
                                fill={color}
                            />
                            {showLabel && (
                                <Label
                                    x={lp.x + 4 / zoom}
                                    y={lp.y - fontSize - 2 / zoom}
                                    listening={false}
                                >
                                    <Tag fill={withAlpha(tokens.overlay, 0.86)} cornerRadius={2 / zoom} />
                                    <Text
                                        text={`(${lp.gridIndex.i},${lp.gridIndex.j})`}
                                        fontSize={fontSize}
                                        fill={tokens.fg}
                                        padding={labelPad}
                                    />
                                </Label>
                            )}
                        </Group>
                    );
                }

                return null;
    };

    return (
        <>
            {areaFeatures.map(renderFeature)}
            {pointFeatures.map(renderFeature)}
        </>
    );
});
