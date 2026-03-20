import { useCallback, useEffect, useRef, useState } from "react";

import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import EditorGallery from "../components/editor/EditorGallery";
import SeoHead from "../components/seo/SeoHead.tsx";
import EditorRightPanel from "../components/editor/panels/EditorRightPanel";
import { useEditorStore, type OverlayVisibilityKey, type ToolType } from "../store/editor/useEditorStore";
import {
    ChevronDown,
    MousePointer2,
    MapPin,
    Minus,
    Edit2,
    Square,
    Circle,
    Eye,
    EyeOff,
    Layers,
    Image as ImageIcon,
} from "lucide-react";
import ZoomControls from "../components/shared/ZoomControls";

const OVERLAY_LAYERS: { key: OverlayVisibilityKey; label: string }[] = [
    { key: "features", label: "Features" },
    { key: "algorithmOverlay", label: "Algorithm overlay" },
];

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
            <button
                onClick={() => setOpen((v) => !v)}
                title="Layer visibility"
                className={`p-3 rounded-md transition-colors ${
                    open ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
            >
                {allVisible ? <Layers size={18} /> : <EyeOff size={18} />}
            </button>
            {open && (
                <div className="absolute left-full top-0 ml-2 z-50 w-44 rounded-lg border border-border bg-surface shadow-lg py-1">
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
    } = useEditorStore();
    const [annotationToolsOpen, setAnnotationToolsOpen] = useState(false);

    const manualTools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
        { id: "POINT", icon: <MapPin size={22} />, label: "Point" },
        { id: "LINE", icon: <Minus size={22} />, label: "Line" },
        { id: "POLYLINE", icon: <Edit2 size={22} />, label: "Polyline" },
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

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
            <div className="w-16 border-r border-border bg-muted/20 shrink-0 flex h-full flex-col">
                <div className="shrink-0 flex flex-col items-center gap-3 px-2 pt-4">
                    <button
                        onClick={() => setGalleryMode(true)}
                        title="Back to Gallery"
                        className="p-3 rounded-md text-primary hover:bg-muted transition-colors font-bold"
                    >
                        <ImageIcon size={20} />
                    </button>

                    <div className="w-full border-t border-border" />

                    <button
                        onClick={() => setActiveTool("SELECT")}
                        title="Select"
                        className={`p-3 rounded-md flex items-center justify-center transition-colors mx-auto ${
                            activeTool === "SELECT"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                        <MousePointer2 size={18} />
                    </button>

                    <OverlayVisibilityPopover />
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-4">
                    <div className="rounded-xl border border-border/70 bg-background/70 shadow-xs overflow-hidden">
                        <button
                            type="button"
                            onClick={toggleAnnotationTools}
                            title={annotationToolsOpen ? "Collapse manual annotation tools" : "Expand manual annotation tools"}
                            className="flex w-full items-center justify-center gap-1 py-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                        >
                            <Edit2 size={15} />
                            <ChevronDown
                                size={12}
                                className={`transition-transform duration-150 ${annotationToolsOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {annotationToolsOpen && (
                            <div className="flex flex-col gap-2 px-2 pb-2">
                                {manualTools.map((tool) => (
                                    <button
                                        key={tool.id}
                                        onClick={() => setActiveTool(tool.id)}
                                        title={tool.label}
                                        className={`p-3 rounded-md flex items-center justify-center transition-colors ${
                                            activeTool === tool.id
                                                ? "bg-primary text-primary-foreground shadow-xs"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        {tool.icon}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
                <CanvasWorkspace />
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

            <EditorRightPanel />
        </div>
    );
}
