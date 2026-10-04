import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, ButtonLink, ToggleChip, Tooltip } from "@vitavision/ui";

import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import EditorGallery from "../components/editor/EditorGallery";
import SeoHead from "../components/seo/SeoHead.tsx";
import EditorRightPanel from "../components/editor/panels/EditorRightPanel";
import TouchFeatureNav from "../components/editor/TouchFeatureNav";
import { useEditorStore, type OverlayVisibilityKey, type ToolType } from "../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { readDeepLink } from "../hooks/useEditorDeepLink";
import useViewportMode from "../hooks/useViewportMode";
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
const OVERLAY_LAYERS: { key: OverlayVisibilityKey; label: string }[] = [
    { key: "features", label: "Features" },
    { key: "algorithmOverlay", label: "Grid overlay" },
];

/** Toolbar buttons keep a 44 px target: the editor also runs on touch tablets. */
const TOOL_BUTTON = "size-11 px-0";

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
            <Tooltip content="Layer visibility">
                <Button
                    variant={open ? "secondary" : "ghost"}
                    className={TOOL_BUTTON}
                    onClick={() => setOpen((value) => !value)}
                    aria-label="Layer visibility"
                    aria-expanded={open}
                >
                    {allVisible ? <Layers size={18} /> : <EyeOff size={18} />}
                </Button>
            </Tooltip>
            {open && (
                <div
                    className={`absolute z-50 flex w-44 flex-col gap-1 rounded-panel border border-line bg-overlay p-1.5 shadow-lg ${
                        horizontal
                            ? "bottom-full right-0 mb-2"
                            : "left-full top-0 ml-2"
                    }`}
                >
                    {OVERLAY_LAYERS.map(({ key, label }) => (
                        <ToggleChip
                            key={key}
                            checked={overlayVisibility[key]}
                            onCheckedChange={(checked) => setOverlayVisibility(key, checked)}
                            className="w-full"
                        >
                            {overlayVisibility[key] ? <Eye size={14} /> : <EyeOff size={14} />}
                            {label}
                        </ToggleChip>
                    ))}
                </div>
            )}
        </div>
    );
}

function EditorPhoneNotice() {
    return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center px-4 animate-in fade-in">
            <SeoHead
                title="Editor"
                description="Interactive image annotation editor with computer vision algorithm runner."
            />
            <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm">
                <div className="inline-flex rounded-full border border-line bg-raised p-3 text-signal">
                    <Monitor size={22} />
                </div>
                <h1 className="mt-5 text-2xl font-semibold tracking-tight">Editor works best on a larger screen</h1>
                <p className="mt-3 text-sm leading-6 text-fg-muted">
                    The editor stays desktop-first because image review, algorithm tuning, and manual annotation
                    become cramped on phone-sized screens. Open it on a tablet or desktop for the full workflow.
                </p>
                <div className="mt-6">
                    <ButtonLink asChild icon={<ArrowLeft />}>
                        <Link to="/">Back to Home</Link>
                    </ButtonLink>
                </div>
            </div>
        </div>
    );
}

export default function Editor() {
    const {
        activeTool,
        setActiveTool,
        galleryMode,
        setGalleryMode,
        galleryImages,
        setImage,
        setFeatures,
        imageSrc,
    } = useEditorStore(useShallow((s) => ({
        activeTool: s.activeTool,
        setActiveTool: s.setActiveTool,
        galleryMode: s.galleryMode,
        setGalleryMode: s.setGalleryMode,
        galleryImages: s.galleryImages,
        setImage: s.setImage,
        setFeatures: s.setFeatures,
        imageSrc: s.imageSrc,
    })));
    const [annotationToolsOpen, setAnnotationToolsOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const deepLinkAppliedRef = useRef(false);
    const { isPhone, isTouchTablet, isLandscape } = useViewportMode();

    // Revoke blob: URLs and scrub them from the store when the user leaves /editor.
    // Editor stays mounted across galleryMode toggles, so this only fires on route navigation.
    useEffect(() => {
        return () => {
            const state = useEditorStore.getState();
            for (const img of state.galleryImages) {
                if (img.src.startsWith("blob:")) {
                    URL.revokeObjectURL(img.src);
                }
            }
            if (state.imageSrc?.startsWith("blob:")) {
                URL.revokeObjectURL(state.imageSrc);
            }
            useEditorStore.setState({
                galleryImages: state.galleryImages.filter((img) => !img.src.startsWith("blob:")),
                ...(state.imageSrc?.startsWith("blob:")
                    ? { imageSrc: null, imageName: null, imageWidth: 0, imageHeight: 0, imageSampleId: "upload" as const }
                    : {}),
            });
        };
    }, []);

    useEffect(() => {
        if (deepLinkAppliedRef.current || imageSrc !== null) {
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

        deepLinkAppliedRef.current = true;
        const image = new Image();
        image.src = sample.src;
        image.onload = () => {
            setImage(sample.src, image.width, image.height, sample.name, sample.sampleId);
            setFeatures([]);
            setGalleryMode(false);
        };
    }, [searchParams, galleryImages, imageSrc, setImage, setFeatures, setGalleryMode]);

    const manualTools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
        { id: "POINT", icon: <MapPin size={22} />, label: "Point" },
        { id: "LINE", icon: <Minus size={22} />, label: "Line" },
        { id: "POLYLINE", icon: <Edit2 size={22} />, label: "Polyline" },
        { id: "POLYGON", icon: <Pentagon size={22} />, label: "Polygon" },
        { id: "BBOX", icon: <Square size={22} />, label: "Bounding Box" },
        { id: "ELLIPSE", icon: <Circle size={22} />, label: "Ellipse" },
    ];

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
            <Tooltip content="Back to Gallery">
                <Button
                    variant="ghost"
                    className={`${TOOL_BUTTON} text-signal hover:text-signal-strong`}
                    onClick={() => setGalleryMode(true)}
                    aria-label="Back to Gallery"
                >
                    <ImageIcon size={20} />
                </Button>
            </Tooltip>

            <div className={horizontalToolbar ? "h-full border-l border-line" : "w-full border-t border-line"} />

            <Tooltip content="Select">
                <Button
                    variant={activeTool === "SELECT" ? "primary" : "ghost"}
                    className={TOOL_BUTTON}
                    onClick={() => setActiveTool("SELECT")}
                    data-testid="tool-select"
                    aria-label="Select"
                    aria-pressed={activeTool === "SELECT"}
                >
                    <MousePointer2 size={18} />
                </Button>
            </Tooltip>

            <OverlayVisibilityPopover horizontal={horizontalToolbar} />

            <div className={horizontalToolbar ? "flex items-center" : "flex-1 overflow-y-auto px-2 py-4"}>
                <div className={horizontalToolbar
                    ? "flex items-center gap-1 px-1"
                    : "w-full overflow-hidden rounded-panel border border-line bg-surface"
                }>
                    <Tooltip content={annotationToolsOpen ? "Collapse tools" : "Annotation tools"}>
                        <Button
                            variant="ghost"
                            onClick={toggleAnnotationTools}
                            aria-label={annotationToolsOpen ? "Collapse tools" : "Annotation tools"}
                            aria-expanded={annotationToolsOpen}
                            aria-controls={annotationToolsPanelId}
                            className={horizontalToolbar
                                ? TOOL_BUTTON
                                : "h-auto min-h-[58px] w-full flex-col rounded-none px-2 py-3"
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
                        </Button>
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
                                <Tooltip key={tool.id} content={tool.label}>
                                    <Button
                                        variant={activeTool === tool.id ? "primary" : "ghost"}
                                        className={TOOL_BUTTON}
                                        onClick={() => setActiveTool(tool.id)}
                                        tabIndex={annotationToolsOpen ? 0 : -1}
                                        data-testid={`tool-${tool.id.toLowerCase()}`}
                                        aria-label={tool.label}
                                        aria-pressed={activeTool === tool.id}
                                    >
                                        {tool.icon}
                                    </Button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    const canvasArea = (
        // Transparency-grid background: two 4×4 squares tiled in an 8×8 SVG.
        // Light: white bg / #e5e7eb squares. Dark: #181818 bg / #282828 squares.
        // The previous base64 encoded invalid path data (underscores as spaces +
        // a stray non-printable byte), so the pattern never rendered. Fixed here.
        <div className="relative flex-1 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMxODE4MTgiLz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMjgyODI4Ii8+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzI4MjgyOCIvPjwvc3ZnPg==')]">
            <ErrorBoundary><CanvasWorkspace /></ErrorBoundary>
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
                    <div className="flex h-12 items-center gap-1 overflow-x-auto border-t border-line bg-surface px-2">
                        {toolbarContent}
                    </div>
                </div>
                <div className="w-80 shrink-0 overflow-y-auto border-l border-line bg-ground">
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

                <div className="border-t border-line bg-surface">
                    <div className="flex h-16 items-center gap-1 overflow-x-auto px-2">
                        {toolbarContent}
                    </div>
                    <div className="h-[20rem] border-t border-line bg-ground">
                        <EditorRightPanel variant="touch" />
                    </div>
                </div>
            </div>
        );

        return touchTabletContent;
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
            <SeoHead
                title="Editor"
                description="Interactive image annotation editor with computer vision algorithm runner."
            />
            <div className="flex h-full w-16 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface px-2 pt-4">
                {toolbarContent}
            </div>

            {canvasArea}
            <EditorRightPanel />
        </div>
    );
}
