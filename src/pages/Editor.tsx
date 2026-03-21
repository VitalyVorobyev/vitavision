import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import EditorGallery from "../components/editor/EditorGallery";
import SeoHead from "../components/seo/SeoHead.tsx";
import EditorRightPanel from "../components/editor/panels/EditorRightPanel";
import Tooltip from "../components/ui/Tooltip";
import { useEditorStore, type OverlayVisibilityKey, type ToolType } from "../store/editor/useEditorStore";
import { readDeepLink } from "../hooks/useEditorDeepLink";
import {
    ChevronDown,
    MousePointer2,
    MapPin,
    Minus,
    Edit2,
    Pentagon,
    Square,
    Circle,
    Eye,
    EyeOff,
    Layers,
    Image as ImageIcon,
} from "lucide-react";
import ZoomControls from "../components/shared/ZoomControls";

/* ── hooks ───────────────────────────────────────────────────── */

/** Returns true when no fine pointer is available (touch-only device). */
function useTouchOnly(): boolean {
    const [touchOnly, setTouchOnly] = useState(() =>
        typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches,
    );

    useEffect(() => {
        const mql = window.matchMedia("(pointer: fine)");
        const handler = (e: MediaQueryListEvent) => setTouchOnly(!e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    return touchOnly;
}

/** Returns true when the viewport is narrower than `breakpoint` px. */
function useNarrowViewport(breakpoint = 768): boolean {
    const [narrow, setNarrow] = useState(() =>
        typeof window !== "undefined" && window.innerWidth < breakpoint,
    );

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [breakpoint]);

    return narrow;
}

/* ── constants ───────────────────────────────────────────────── */

const OVERLAY_LAYERS: { key: OverlayVisibilityKey; label: string }[] = [
    { key: "features", label: "Features" },
    { key: "algorithmOverlay", label: "Algorithm overlay" },
];

const TOOL_BUTTON =
    "min-w-[44px] min-h-[44px] rounded-md flex items-center justify-center transition-colors";

/* ── sub-components ──────────────────────────────────────────── */

function OverlayVisibilityPopover() {
    const { overlayVisibility, setOverlayVisibility } = useEditorStore();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const allVisible = OVERLAY_LAYERS.every((l) => overlayVisibility[l.key]);

    const handleClose = useCallback((e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
            setOpen(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        document.addEventListener("mousedown", handleClose);
        return () => document.removeEventListener("mousedown", handleClose);
    }, [open, handleClose]);

    return (
        <div ref={ref} className="relative">
            <Tooltip content="Layer visibility">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className={`${TOOL_BUTTON} ${
                        open ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                    {allVisible ? <Layers size={18} /> : <EyeOff size={18} />}
                </button>
            </Tooltip>
            {open && (
                <div className="absolute left-full top-0 ml-2 z-50 w-44 rounded-lg border border-border bg-surface shadow-lg py-1 max-md:left-auto max-md:right-0 max-md:top-auto max-md:bottom-full max-md:mb-2 max-md:ml-0">
                    {OVERLAY_LAYERS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setOverlayVisibility(key, !overlayVisibility[key])}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors"
                        >
                            {overlayVisibility[key]
                                ? <Eye size={14} className="text-primary" />
                                : <EyeOff size={14} className="text-muted-foreground/50" />
                            }
                            <span className={overlayVisibility[key] ? "text-foreground" : "text-muted-foreground"}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── main component ──────────────────────────────────────────── */

export default function Editor() {
    const {
        activeTool,
        setActiveTool,
        zoom,
        setZoom,
        setPan,
        imageWidth,
        imageHeight,
        galleryMode,
        setGalleryMode,
        galleryImages,
        setImage,
        setFeatures,
        imageSrc,
    } = useEditorStore();
    const [annotationToolsOpen, setAnnotationToolsOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const deepLinkApplied = useRef(false);
    const touchOnly = useTouchOnly();
    const narrow = useNarrowViewport();

    // Auto-select sample image from deep link ?sample=chessboard
    useEffect(() => {
        if (deepLinkApplied.current || imageSrc !== null) return;
        const { sampleId } = readDeepLink(searchParams);
        if (!sampleId) return;
        const sample = galleryImages.find((img) => img.sampleId === sampleId);
        if (!sample) return;
        deepLinkApplied.current = true;
        const img = new Image();
        img.src = sample.src;
        img.onload = () => {
            setImage(sample.src, img.width, img.height, sample.name, sample.sampleId);
            setFeatures([]);
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setGalleryMode(false);
        };
    }, [searchParams, galleryImages, imageSrc, setImage, setFeatures, setZoom, setPan, setGalleryMode]);

    const manualTools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
        { id: "POINT", icon: <MapPin size={22} />, label: "Point" },
        { id: "LINE", icon: <Minus size={22} />, label: "Line" },
        { id: "POLYLINE", icon: <Edit2 size={22} />, label: "Polyline" },
        { id: "POLYGON", icon: <Pentagon size={22} />, label: "Polygon" },
        { id: "BBOX", icon: <Square size={22} />, label: "Bounding Box" },
        { id: "ELLIPSE", icon: <Circle size={22} />, label: "Ellipse" },
    ];

    const handleZoomIn = () => setZoom(zoom * 1.2);
    const handleZoomOut = () => setZoom(zoom / 1.2);
    const handleZoomActual = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleZoomFit = () => {
        if (!imageWidth || !imageHeight) {
            return;
        }
        const scale = Math.min(800 / imageWidth, 600 / imageHeight);
        setZoom(scale * 0.9);
        setPan({
            x: 400 - (imageWidth * scale * 0.9) / 2,
            y: 300 - (imageHeight * scale * 0.9) / 2,
        });
    };

    const toggleAnnotationTools = () => {
        setAnnotationToolsOpen((open) => {
            const next = !open;
            if (!next && activeTool !== "SELECT") {
                setActiveTool("SELECT");
            }
            return next;
        });
    };

    if (galleryMode) {
        return (
            <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                <SeoHead
                    title="Editor"
                    description="Interactive image annotation editor with computer vision algorithm runner."
                />
                <EditorGallery />
            </div>
        );
    }

    /* ── toolbar content (shared between vertical rail and horizontal bar) ── */

    const toolbarContent = (
        <>
            <Tooltip content="Back to Gallery" side={narrow ? "top" : "right"}>
                <button
                    onClick={() => setGalleryMode(true)}
                    className={`${TOOL_BUTTON} text-primary hover:bg-muted font-bold`}
                >
                    <ImageIcon size={20} />
                </button>
            </Tooltip>

            <div className={narrow ? "h-full border-l border-border" : "w-full border-t border-border"} />

            <Tooltip content="Select" side={narrow ? "top" : "right"}>
                <button
                    onClick={() => setActiveTool("SELECT")}
                    className={`${TOOL_BUTTON} ${
                        activeTool === "SELECT"
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                    <MousePointer2 size={18} />
                </button>
            </Tooltip>

            <OverlayVisibilityPopover />

            {/* Drawing tools — hidden on touch-only devices */}
            {!touchOnly && (
                <div className={narrow
                    ? "flex items-center"
                    : "flex-1 overflow-y-auto px-2 py-4"
                }>
                    <div className={narrow
                        ? "flex items-center gap-1 px-1"
                        : "w-full rounded-xl border border-border/70 bg-background/70 shadow-xs overflow-hidden"
                    }>
                        <Tooltip content={annotationToolsOpen ? "Collapse tools" : "Annotation tools"} side={narrow ? "top" : "right"}>
                            <button
                                type="button"
                                onClick={toggleAnnotationTools}
                                className={narrow
                                    ? `${TOOL_BUTTON} text-muted-foreground hover:bg-muted/40 hover:text-foreground`
                                    : "flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                                }
                            >
                                {narrow ? (
                                    <>
                                        <Edit2 size={15} />
                                        <ChevronDown
                                            size={12}
                                            className={`transition-transform duration-150 ${annotationToolsOpen ? "rotate-90" : ""}`}
                                        />
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <Edit2 size={15} />
                                        <ChevronDown
                                            size={12}
                                            className={`transition-transform duration-150 ${annotationToolsOpen ? "rotate-180" : ""}`}
                                        />
                                    </div>
                                )}
                            </button>
                        </Tooltip>
                        {annotationToolsOpen && (
                            <div className={narrow ? "flex gap-1" : "flex flex-col items-center gap-2 px-2 pb-2"}>
                                {manualTools.map((tool) => (
                                    <Tooltip key={tool.id} content={tool.label} side={narrow ? "top" : "right"}>
                                        <button
                                            onClick={() => setActiveTool(tool.id)}
                                            className={`${TOOL_BUTTON} ${
                                                activeTool === tool.id
                                                    ? "bg-primary text-primary-foreground shadow-xs"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            }`}
                                        >
                                            {tool.icon}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    /* ── canvas area (shared) ── */

    const canvasArea = (
        <div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
            <ErrorBoundary><CanvasWorkspace /></ErrorBoundary>
            <div className="absolute top-3 right-3">
                <ZoomControls
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onFit={handleZoomFit}
                    onActual={handleZoomActual}
                    zoomPercent={Math.round(zoom * 100)}
                />
            </div>
        </div>
    );

    /* ── narrow (mobile) layout: vertical stack ── */

    if (narrow) {
        return (
            <TooltipPrimitive.Provider delayDuration={200}>
                <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                    <SeoHead
                        title="Editor"
                        description="Interactive image annotation editor with computer vision algorithm runner."
                    />
                    {/* Canvas takes 60vh */}
                    <div className="h-[60vh] relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
                        <ErrorBoundary><CanvasWorkspace /></ErrorBoundary>
                        <div className="absolute top-3 right-3">
                            <ZoomControls
                                onZoomIn={handleZoomIn}
                                onZoomOut={handleZoomOut}
                                onFit={handleZoomFit}
                                onActual={handleZoomActual}
                                zoomPercent={Math.round(zoom * 100)}
                            />
                        </div>
                    </div>

                    {/* Bottom toolbar (horizontal) */}
                    <div className="h-14 border-t border-border bg-muted/20 shrink-0 flex items-center gap-1 px-2 overflow-x-auto">
                        {toolbarContent}
                    </div>

                    {/* Right panel below */}
                    <div className="flex-1 overflow-y-auto border-t border-border">
                        <EditorRightPanel />
                    </div>
                </div>
            </TooltipPrimitive.Provider>
        );
    }

    /* ── wide (desktop) layout: three-panel ── */

    return (
        <TooltipPrimitive.Provider delayDuration={200}>
            <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                <SeoHead
                    title="Editor"
                    description="Interactive image annotation editor with computer vision algorithm runner."
                />
                {/* Left rail (vertical) */}
                <div className="w-16 border-r border-border bg-muted/20 shrink-0 flex h-full flex-col items-center gap-3 px-2 pt-4">
                    {toolbarContent}
                </div>

                {canvasArea}
                <EditorRightPanel />
            </div>
        </TooltipPrimitive.Provider>
    );
}
