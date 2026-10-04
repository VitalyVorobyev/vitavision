import { useCallback, useMemo, useRef, useState } from "react";
import { HeatmapLayer, ImageLayer, ImageStage, type StageHandle } from "@vitavision/stage2d";
import { TargetOverlay, type TargetHit } from "@vitavision/overlays";
import { Button } from "@vitavision/ui";
import { useShallow } from "zustand/react/shallow";

import AnnotationLayer from "./annotations/AnnotationLayer";
import { isDetectionFeature, detectionGroups, toTargetDetection } from "./overlay/targetDetection";
import FeatureTooltip, { type DirectedPointTooltipState } from "./canvas/FeatureTooltip";
import PixelReadout, { type PixelReadoutHandle } from "./canvas/PixelReadout";
import { useDrawing } from "./hooks/useDrawing";
import { useRadsymHeatmap } from "./algorithms/radsym/useRadsymHeatmap";
import { isFeatureVisible } from "../../store/editor/featureGroups";
import { useEditorStore, type Feature } from "../../store/editor/useEditorStore";
import CanvasControlsHint from "../shared/CanvasControlsHint";
import ZoomControls from "../shared/ZoomControls";
import useViewportMode from "../../hooks/useViewportMode";

/** How far a zoom button steps the scale. */
const ZOOM_STEP = 1.2;
/** Where a tooltip sits from the pointer. */
const TOOLTIP_OFFSET_PX = 12;

export default function CanvasWorkspace() {
    const {
        imageSrc,
        imageName,
        imageWidth,
        imageHeight,
        view,
        setView,
        setImage,
        activeTool,
        toolVersion,
        features,
        addFeature,
        updateFeature,
        selectedFeatureId,
        setSelectedFeatureId,
        lastAlgorithmResult,
        featureGroupVisibility,
        overlayVisibility,
        overlayToggles,
        heatmapData,
        heatmapVisible,
        heatmapOpacity,
    } = useEditorStore(useShallow((s) => ({
        imageSrc: s.imageSrc,
        imageName: s.imageName,
        imageWidth: s.imageWidth,
        imageHeight: s.imageHeight,
        view: s.view,
        setView: s.setView,
        setImage: s.setImage,
        activeTool: s.activeTool,
        toolVersion: s.toolVersion,
        features: s.features,
        addFeature: s.addFeature,
        updateFeature: s.updateFeature,
        selectedFeatureId: s.selectedFeatureId,
        setSelectedFeatureId: s.setSelectedFeatureId,
        lastAlgorithmResult: s.lastAlgorithmResult,
        featureGroupVisibility: s.featureGroupVisibility,
        overlayVisibility: s.overlayVisibility,
        overlayToggles: s.overlayToggles,
        heatmapData: s.heatmapData,
        heatmapVisible: s.heatmapVisible,
        heatmapOpacity: s.heatmapOpacity,
    })));

    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<StageHandle>(null);
    const readoutRef = useRef<PixelReadoutHandle>(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const [tooltip, setTooltip] = useState<DirectedPointTooltipState | null>(null);
    const { isTouchPrimary, isTouchTablet } = useViewportMode();

    useRadsymHeatmap();

    const drawing = useDrawing(activeTool, toolVersion, addFeature);

    /* ── What is drawn ── */

    const featureById = useMemo(() => new Map(features.map((feature) => [feature.id, feature])), [features]);
    const visible = useMemo(
        () => (overlayVisibility.features ? features.filter((feature) => isFeatureVisible(feature, featureGroupVisibility)) : []),
        [features, featureGroupVisibility, overlayVisibility.features],
    );
    const annotations = useMemo(() => visible.filter((feature) => !isDetectionFeature(feature)), [visible]);
    const detections = useMemo(
        () =>
            detectionGroups(visible, lastAlgorithmResult).map((group) => ({
                key: group.key,
                detection: toTargetDetection(group.algorithmId, group.features, group.result),
            })),
        [visible, lastAlgorithmResult],
    );
    const selection = useMemo(() => (selectedFeatureId === null ? [] : [selectedFeatureId]), [selectedFeatureId]);
    const gridOverlay = overlayVisibility.algorithmOverlay;

    const image = useMemo(() => ({ width: imageWidth, height: imageHeight }), [imageWidth, imageHeight]);
    const scale = view?.scale ?? 1;

    /* ── Hover and tap affordances ── */

    const tooltipAt = useCallback((feature: Feature | null, client: { x: number; y: number }) => {
        const box = containerRef.current?.getBoundingClientRect();
        if (feature?.type !== "directed_point" || !box) {
            setTooltip(null);
            return;
        }
        setTooltip({ feature, left: client.x - box.left + TOOLTIP_OFFSET_PX, top: client.y - box.top + TOOLTIP_OFFSET_PX });
    }, []);

    // The mouse hovers a corner: show its numbers beside the pointer. A touch has no hover, so a tap shows them (see `onTap`).
    const onOverlayHover = useCallback(
        (hit: TargetHit | null) => tooltipAt(hit ? (featureById.get(String(hit.id)) ?? null) : null, pointerRef.current),
        [featureById, tooltipAt],
    );

    const onPointerMove = (event: React.PointerEvent) => {
        pointerRef.current = { x: event.clientX, y: event.clientY };
        if (tooltip && event.pointerType !== "touch") tooltipAt(tooltip.feature, pointerRef.current);
    };

    /* ── Drop to load ── */

    // Track the most-recent drag-and-drop blob URL so we can revoke it when a
    // second file is dropped (the first URL is then orphaned by setImage).
    const droppedBlobUrlRef = useRef<string | null>(null);

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();

        if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return;

        const file = event.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;

        // Revoke the previous blob URL (if any) before creating a new one.
        if (droppedBlobUrlRef.current) {
            URL.revokeObjectURL(droppedBlobUrlRef.current);
        }

        const url = URL.createObjectURL(file);
        droppedBlobUrlRef.current = url;
        const img = new Image();
        // `setImage` clears the view; the stage opens the new image fit.
        img.onload = () => setImage(url, img.width, img.height, file.name);
        img.src = url;
    };

    /* ── Derived ── */

    const drawsShapes = activeTool === "POLYLINE" || activeTool === "POLYGON";
    const controlHints = isTouchPrimary
        ? [
            activeTool === "SELECT" ? "Tap selects or edits" : "Tap uses the active tool",
            activeTool === "SELECT" ? "Drag pans the canvas" : "Two fingers pan",
            "Pinch zooms",
            ...(drawsShapes ? ["Use Finish shape to complete the outline"] : []),
        ]
        : [
            activeTool === "SELECT" ? "Left click selects or edits" : "Left click uses the active tool",
            "Right drag pans",
            "Wheel zooms",
            ...(drawsShapes ? ["Double click finishes the shape"] : []),
        ];

    return (
        <div
            ref={containerRef}
            data-testid="editor-canvas"
            className="w-full h-full relative overflow-hidden"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            onPointerMove={onPointerMove}
        >
            {!imageSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted/40">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <p className="text-sm text-fg-muted/60">Drop an image here or use the gallery</p>
                </div>
            )}

            <PixelReadout
                ref={readoutRef}
                imageSrc={imageSrc}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                suppressed={tooltip !== null}
            />

            <FeatureTooltip tooltip={tooltip} />
            <CanvasControlsHint lines={controlHints} className="bottom-4 right-4 max-w-52" />

            <div className="absolute top-3 right-3 z-20">
                <ZoomControls
                    onZoomIn={() => stageRef.current?.zoomTo(scale * ZOOM_STEP)}
                    onZoomOut={() => stageRef.current?.zoomTo(scale / ZOOM_STEP)}
                    onFit={() => stageRef.current?.fit()}
                    onActual={() => stageRef.current?.zoomTo(1)}
                    {...(view && { zoomPercent: Math.round(view.scale * 100) })}
                    touchFriendly={isTouchTablet}
                />
            </div>

            {isTouchPrimary && drawsShapes && drawing.hasVertices && (
                <div className="absolute bottom-4 left-4 z-20">
                    <Button onClick={() => drawing.finish()} className="shadow-xs">
                        Finish shape
                    </Button>
                </div>
            )}

            {imageSrc && imageWidth > 0 && imageHeight > 0 && (
                <ImageStage
                    ref={stageRef}
                    image={image}
                    view={view}
                    onView={setView}
                    initialView="fit"
                    panButton="right"
                    doubleClickFit={false}
                    touchPan={activeTool === "SELECT" ? "one-finger" : "two-finger"}
                    panKeys={false}
                    onHover={(point) => readoutRef.current?.hover(point)}
                    className="rounded-none border-0"
                >
                    <ImageLayer src={imageSrc} alt={imageName ?? "Image under annotation"} />

                    {heatmapData && (
                        <HeatmapLayer
                            rgba={heatmapData.rgba}
                            width={heatmapData.width}
                            height={heatmapData.height}
                            opacity={heatmapOpacity}
                            visible={heatmapVisible}
                        />
                    )}

                    {detections.map(({ key, detection }) => (
                        <TargetOverlay
                            key={key}
                            detection={detection}
                            showEdges={gridOverlay && overlayToggles.edges}
                            showLabels={gridOverlay && overlayToggles.labels}
                            selectedIds={selection}
                            onHoverChange={onOverlayHover}
                            layerIdPrefix={`det-${key}`}
                        />
                    ))}

                    <AnnotationLayer
                        tool={activeTool}
                        drawing={drawing}
                        annotations={annotations}
                        featureById={featureById}
                        selectedId={selectedFeatureId}
                        onSelect={setSelectedFeatureId}
                        onUpdate={updateFeature}
                        onTap={tooltipAt}
                    />
                </ImageStage>
            )}
        </div>
    );
}
