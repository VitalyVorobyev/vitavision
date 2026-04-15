import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import EditorGallery from "../components/editor/EditorGallery";
import SeoHead from "../components/seo/SeoHead.tsx";
import EditorRightPanel from "../components/editor/panels/EditorRightPanel";
import TouchFeatureNav from "../components/editor/TouchFeatureNav";
import Tooltip from "../components/ui/Tooltip";
import { useEditorStore, type OverlayVisibilityKey, type ToolType } from "../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { readDeepLink } from "../hooks/useEditorDeepLink";
import useViewportMode from "../hooks/useViewportMode";
import { FormControlModeProvider } from "../components/editor/algorithms/formFields";
import {
    ArrowLeft,
    ChevronDown,
    Circle,
    Edit2,
    Eye,
    EyeOff,
    Image as ImageIcon,
    Layers,
    MapPin,
    Minus,
    Monitor,
    MousePointer2,
    Pentagon,
    Square,
} from "lucide-react";
import ZoomControls from "../components/shared/ZoomControls";
const OVERLAY_LAYERS: { key: OverlayVisibilityKey; label: string }[] = [
    { key: "features", label: "Features" },
    { key: "algorithmOverlay", label: "Grid overlay" },
];

const TOOL_BUTTON =
    "min-w-[44px] min-h-[44px] rounded-md flex items-center justify-center transition-colors";

function OverlayVisibilityPopover({ horizontal }: { horizontal: boolean }) {
    const { overlayVisibility, setOverlayVisibility } = useEditorStore(useShallow((s) => ({
        overlayVisibility: s.overlayVisibility,
        setOverlayVisibility: s.setOverlayVisibility,
    })));
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const allVisible = OVERLAY_LAYERS.every((layer) => overlayVisibility[layer.key]);

    const handleClose = useCallback((event: PointerEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
            setOpen(false);
        }
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        document.addEventListener("pointerdown", handleClose);
        return () => document.removeEventListener("pointerdown", handleClose);
    }, [open, handleClose]);

    return (
        <div ref={ref} className="relative">
            <Tooltip content="Layer visibility" side={horizontal ? "top" : "right"}>
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className={`${TOOL_BUTTON} ${
                        open ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                    {allVisible ? <Layers size={18} /> : <EyeOff size={18} />}
                </button>
            </Tooltip>
            {open && (
                <div
                    className={`absolute z-50 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg ${
                        horizontal
                            ? "bottom-full right-0 mb-2"
                            : "left-full top-0 ml-2"
                    }`}
                >
                    {OVERLAY_LAYERS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setOverlayVisibility(key, !overlayVisibility[key])}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60"
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

function EditorPhoneNotice() {
    return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-muted/10 px-4 animate-in fade-in">
            <SeoHead
                title="Editor"
                description="Interactive image annotation editor with computer vision algorithm runner."
            />
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <div className="inline-flex rounded-full border border-border bg-background p-3 text-primary">
                    <Monitor size={22} />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight">Editor works best on a larger screen</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    The editor stays desktop-first because image review, algorithm tuning, and manual annotation
                    become cramped on phone-sized screens. Open it on a tablet or desktop for the full workflow.
                </p>
                <div className="mt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

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
    } = useEditorStore(useShallow((s) => ({
        activeTool: s.activeTool,
        setActiveTool: s.setActiveTool,
        zoom: s.zoom,
        setZoom: s.setZoom,
        setPan: s.setPan,
        imageWidth: s.imageWidth,
        imageHeight: s.imageHeight,
        galleryMode: s.galleryMode,
        setGalleryMode: s.setGalleryMode,
        galleryImages: s.galleryImages,
        setImage: s.setImage,
        setFeatures: s.setFeatures,
        imageSrc: s.imageSrc,
    })));
    const [annotationToolsOpen, setAnnotationToolsOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const deepLinkApplied = useRef(false);
    const { isPhone, isTouchTablet, isLandscape } = useViewportMode();

    useEffect(() => {
        if (deepLinkApplied.current || imageSrc !== null) {
            return;
        }

        const { sampleId } = readDeepLink(searchParams);
        if (!sampleId) {
            return;
        }

        const sample = galleryImages.find((image) => image.sampleId === sampleId);
        if (!sample) {
            return;
        }

        deepLinkApplied.current = true;
        const image = new Image();
        image.src = sample.src;
        image.onload = () => {
            setImage(sample.src, image.width, image.height, sample.name, sample.sampleId);
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

    const horizontalToolbar = isTouchTablet;
    const annotationToolsPanelId = horizontalToolbar
        ? "editor-annotation-tools-touch"
        : "editor-annotation-tools-desktop";

    if (isPhone) {
        return <EditorPhoneNotice />;
    }

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

    const toolbarContent = (
        <>
            <Tooltip content="Back to Gallery" side={horizontalToolbar ? "top" : "right"}>
                <button
                    type="button"
                    onClick={() => setGalleryMode(true)}
                    className={`${TOOL_BUTTON} font-bold text-primary hover:bg-muted`}
                >
                    <ImageIcon size={20} />
                </button>
            </Tooltip>

            <div className={horizontalToolbar ? "h-full border-l border-border" : "w-full border-t border-border"} />

            <Tooltip content="Select" side={horizontalToolbar ? "top" : "right"}>
                <button
                    type="button"
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

            <OverlayVisibilityPopover horizontal={horizontalToolbar} />

            <div className={horizontalToolbar ? "flex items-center" : "flex-1 overflow-y-auto px-2 py-4"}>
                <div className={horizontalToolbar
                    ? "flex items-center gap-1 px-1"
                    : "w-full overflow-hidden rounded-xl border border-border/70 bg-background/70 shadow-xs"
                }>
                    <Tooltip content={annotationToolsOpen ? "Collapse tools" : "Annotation tools"} side={horizontalToolbar ? "top" : "right"}>
                        <button
                            type="button"
                            onClick={toggleAnnotationTools}
                            aria-expanded={annotationToolsOpen}
                            aria-controls={annotationToolsPanelId}
                            className={horizontalToolbar
                                ? `${TOOL_BUTTON} text-muted-foreground hover:bg-muted/40 hover:text-foreground`
                                : "flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                            }
                        >
                            {horizontalToolbar ? (
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
                    <div
                        id={annotationToolsPanelId}
                        aria-hidden={!annotationToolsOpen}
                        className={horizontalToolbar
                            ? `overflow-hidden transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none ${
                                annotationToolsOpen ? "max-w-[24rem] opacity-100" : "pointer-events-none max-w-0 opacity-0"
                            }`
                            : `w-full overflow-hidden transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none ${
                                annotationToolsOpen ? "max-h-[24rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
                            }`
                        }
                    >
                        <div
                            className={horizontalToolbar
                                ? `flex gap-1 pl-1 transition-transform duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
                                    annotationToolsOpen ? "translate-x-0" : "-translate-x-2"
                                }`
                                : `flex flex-col items-center gap-2 px-2 pb-2 transition-transform duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
                                    annotationToolsOpen ? "translate-y-0" : "-translate-y-2"
                                }`
                            }
                        >
                            {manualTools.map((tool) => (
                                <Tooltip key={tool.id} content={tool.label} side={horizontalToolbar ? "top" : "right"}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTool(tool.id)}
                                        tabIndex={annotationToolsOpen ? 0 : -1}
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
                    </div>
                </div>
            </div>
        </>
    );

    const canvasArea = (
        <div className="relative flex-1 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
            <ErrorBoundary><CanvasWorkspace /></ErrorBoundary>
            <div className="absolute top-3 right-3">
                <ZoomControls
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onFit={handleZoomFit}
                    onActual={handleZoomActual}
                    zoomPercent={Math.round(zoom * 100)}
                    touchFriendly={isTouchTablet}
                />
            </div>
            <TouchFeatureNav />
        </div>
    );

    if (isTouchTablet) {
        const touchTabletContent = isLandscape ? (
            <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                <SeoHead
                    title="Editor"
                    description="Interactive image annotation editor with computer vision algorithm runner."
                />
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 flex flex-col">
                        {canvasArea}
                    </div>
                    <div className="flex h-12 items-center gap-1 overflow-x-auto border-t border-border bg-muted/20 px-2">
                        {toolbarContent}
                    </div>
                </div>
                <div className="w-80 shrink-0 overflow-y-auto border-l border-border bg-background/70">
                    <EditorRightPanel variant="touch" />
                </div>
            </div>
        ) : (
            <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden animate-in fade-in">
                <SeoHead
                    title="Editor"
                    description="Interactive image annotation editor with computer vision algorithm runner."
                />
                <div className="min-h-0 flex-1 flex flex-col">
                    {canvasArea}
                </div>

                <div className="border-t border-border bg-muted/20">
                    <div className="flex h-16 items-center gap-1 overflow-x-auto px-2">
                        {toolbarContent}
                    </div>
                    <div className="h-[20rem] border-t border-border bg-background/70">
                        <EditorRightPanel variant="touch" />
                    </div>
                </div>
            </div>
        );

        return (
            <TooltipPrimitive.Provider delayDuration={200}>
                <FormControlModeProvider mode="touch">
                    {touchTabletContent}
                </FormControlModeProvider>
            </TooltipPrimitive.Provider>
        );
    }

    return (
        <TooltipPrimitive.Provider delayDuration={200}>
            <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                <SeoHead
                    title="Editor"
                    description="Interactive image annotation editor with computer vision algorithm runner."
                />
                <div className="flex h-full w-16 shrink-0 flex-col items-center gap-3 border-r border-border bg-muted/20 px-2 pt-4">
                    {toolbarContent}
                </div>

                {canvasArea}
                <EditorRightPanel />
            </div>
        </TooltipPrimitive.Provider>
    );
}
