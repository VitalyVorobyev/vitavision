import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import EditorGallery from "../components/editor/EditorGallery";
import EditorRightPanel from "../components/editor/panels/EditorRightPanel";
import {
    normalizeImportedFeatures,
    useEditorStore,
    type ToolType,
} from "../store/editor/useEditorStore";
import {
    MousePointer2,
    MapPin,
    Minus,
    Edit2,
    Square,
    Circle,
    ZoomIn,
    ZoomOut,
    Maximize,
    Scaling,
    Eye,
    EyeOff,
    Download,
    Upload,
    Image as ImageIcon,
} from "lucide-react";

export default function Editor() {
    const {
        activeTool,
        setActiveTool,
        features,
        setFeatures,
        showFeatures,
        setShowFeatures,
        zoom,
        setZoom,
        setPan,
        imageWidth,
        imageHeight,
        galleryMode,
        setGalleryMode,
    } = useEditorStore();

    const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
        { id: "SELECT", icon: <MousePointer2 size={18} />, label: "Select" },
        { id: "POINT", icon: <MapPin size={18} />, label: "Point" },
        { id: "LINE", icon: <Minus size={18} />, label: "Line" },
        { id: "POLYLINE", icon: <Edit2 size={18} />, label: "Polyline" },
        { id: "BBOX", icon: <Square size={18} />, label: "Bounding Box" },
        { id: "ELLIPSE", icon: <Circle size={18} />, label: "Ellipse" },
    ];

    const handleExport = () => {
        const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(features, null, 2))}`;
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", "vitavision_features.json");
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                try {
                    const parsed = JSON.parse((readerEvent.target?.result as string) || "null");
                    if (!Array.isArray(parsed)) {
                        alert("Invalid JSON format. Expected an array of features.");
                        return;
                    }

                    const normalized = normalizeImportedFeatures(parsed);
                    if (parsed.length > 0 && normalized.length === 0) {
                        alert("JSON parsed but feature objects are invalid.");
                        return;
                    }

                    setFeatures(normalized);
                } catch {
                    alert("Failed to parse JSON.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

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

    if (galleryMode) {
        return (
            <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                <EditorGallery />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
            <div className="w-16 border-r border-border bg-muted/20 flex flex-col items-center py-4 space-y-4 shrink-0">
                <button
                    onClick={() => setGalleryMode(true)}
                    title="Back to Gallery"
                    className="p-3 rounded-md text-primary hover:bg-muted transition-colors font-bold"
                >
                    <ImageIcon size={20} />
                </button>
                <div className="border-t border-border w-full my-4" />

                <div className="space-y-4 flex flex-col w-full px-2">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            title={tool.label}
                            className={`p-3 rounded-md flex items-center justify-center transition-colors mx-auto ${activeTool === tool.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        >
                            {tool.icon}
                        </button>
                    ))}
                </div>

                <div className="border-t border-border w-full my-4" />

                <button
                    onClick={() => setShowFeatures(!showFeatures)}
                    title={showFeatures ? "Hide Features" : "Show Features"}
                    className="p-3 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                    {showFeatures ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                <div className="flex-1" />

                <div className="flex flex-col space-y-2 w-full px-2 mt-auto">
                    <button onClick={handleZoomIn} title="Zoom In" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><ZoomIn size={16} /></button>
                    <button onClick={handleZoomOut} title="Zoom Out" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><ZoomOut size={16} /></button>
                    <button onClick={handleZoomActual} title="1:1 Size" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><Scaling size={16} /></button>
                    <button onClick={handleZoomFit} title="Fit to Screen" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><Maximize size={16} /></button>
                </div>

                <div className="border-t border-border w-full my-4" />

                <button onClick={handleImport} title="Import JSON" className="p-3 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                    <Upload size={18} />
                </button>
                <button onClick={handleExport} title="Export JSON" className="p-3 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                    <Download size={18} />
                </button>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
                <CanvasWorkspace />
            </div>

            <EditorRightPanel />
        </div>
    );
}
