import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import EditorGallery from "../components/editor/EditorGallery";
import { useEditorStore, type ToolType, type Feature } from "../store/editor/useEditorStore";
import {
    MousePointer2, MapPin, Minus, Edit2, Square, Circle,
    ZoomIn, ZoomOut, Maximize, Scaling,
    Eye, EyeOff, Download, Upload, Trash2, Image as ImageIcon
} from "lucide-react";

export default function Editor() {
    const {
        activeTool, setActiveTool, selectedFeatureId, setSelectedFeatureId,
        features, setFeatures, deleteFeature, showFeatures, setShowFeatures,
        zoom, setZoom, setPan, imageWidth, imageHeight,
        galleryMode, setGalleryMode
    } = useEditorStore();

    const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
        { id: 'SELECT', icon: <MousePointer2 size={18} />, label: 'Select' },
        { id: 'POINT', icon: <MapPin size={18} />, label: 'Point' },
        { id: 'LINE', icon: <Minus size={18} />, label: 'Line' },
        { id: 'POLYLINE', icon: <Edit2 size={18} />, label: 'Polyline' },
        { id: 'BBOX', icon: <Square size={18} />, label: 'Bounding Box' },
        { id: 'ELLIPSE', icon: <Circle size={18} />, label: 'Ellipse' },
    ];

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(features, null, 2));
        const a = document.createElement('a');
        a.setAttribute("href", dataStr);
        a.setAttribute("download", "vitavision_features.json");
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: any) => {
            const file = e.target?.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target?.result as string);
                    if (Array.isArray(parsed)) {
                        setFeatures(parsed as Feature[]);
                    } else {
                        alert("Invalid JSON format. Expected an array of features.");
                    }
                } catch (err) {
                    alert("Failed to parse JSON.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleZoomIn = () => setZoom(zoom * 1.2);
    const handleZoomOut = () => setZoom(zoom / 1.2);
    const handleZoomActual = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
    // Very simple fit logic, usually handled by checking container size, but doing a rough approx
    const handleZoomFit = () => {
        if (imageWidth) {
            // Rough fit based on a typical container size if no ref is available here
            const scale = Math.min(800 / imageWidth, 600 / imageHeight);
            setZoom(scale * 0.9);
            setPan({ x: 400 - (imageWidth * scale * 0.9) / 2, y: 300 - (imageHeight * scale * 0.9) / 2 });
        }
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
            {/* Compact Sidebar Tool panel */}
            <div className="w-16 border-r border-border bg-muted/20 flex flex-col items-center py-4 space-y-4 shrink-0">
                {/* Back to Gallery */}
                <button
                    onClick={() => setGalleryMode(true)}
                    title="Back to Gallery"
                    className="p-3 rounded-md text-primary hover:bg-muted transition-colors font-bold"
                >
                    <ImageIcon size={20} />
                </button>
                <div className="border-t border-border w-full my-4"></div>

                <div className="space-y-4 flex flex-col w-full px-2">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            title={tool.label}
                            className={`p-3 rounded-md flex items-center justify-center transition-colors mx-auto ${activeTool === tool.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            {tool.icon}
                        </button>
                    ))}
                </div>

                <div className="border-t border-border w-full my-4"></div>

                {/* Show/Hide Toggle */}
                <button
                    onClick={() => setShowFeatures(!showFeatures)}
                    title={showFeatures ? "Hide Features" : "Show Features"}
                    className="p-3 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                >
                    {showFeatures ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                <div className="flex-1"></div>

                {/* Zoom Controls (Compact) */}
                <div className="flex flex-col space-y-2 w-full px-2 mt-auto">
                    <button onClick={handleZoomIn} title="Zoom In" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><ZoomIn size={16} /></button>
                    <button onClick={handleZoomOut} title="Zoom Out" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><ZoomOut size={16} /></button>
                    <button onClick={handleZoomActual} title="1:1 Size" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><Scaling size={16} /></button>
                    <button onClick={handleZoomFit} title="Fit to Screen" className="p-2 mx-auto rounded-md text-muted-foreground hover:bg-muted"><Maximize size={16} /></button>
                </div>

                <div className="border-t border-border w-full my-4"></div>

                {/* Serialization Controls */}
                <button onClick={handleImport} title="Import JSON" className="p-3 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                    <Upload size={18} />
                </button>
                <button onClick={handleExport} title="Export JSON" className="p-3 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                    <Download size={18} />
                </button>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
                <CanvasWorkspace />
            </div>

            {/* Properties & Shape List Panel */}
            <div className="w-72 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Properties & Shapes</h2>

                {selectedFeatureId && (
                    <div className="text-xs p-3 mb-4 rounded-md border border-primary/20 bg-primary/5 shadow-sm space-y-1">
                        <div className="font-semibold text-primary mb-1">Selected ID</div>
                        <div className="font-mono truncate">{selectedFeatureId}</div>
                        <button
                            onClick={() => deleteFeature(selectedFeatureId)}
                            className="text-destructive hover:text-destructive/80 mt-2 flex items-center gap-1 font-medium"
                        >
                            <Trash2 size={12} /> Delete Feature
                        </button>
                    </div>
                )}

                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Shape List ({features.length})</h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-10">
                    {features.length === 0 ? (
                        <div className="text-sm text-muted-foreground border border-border border-dashed p-4 rounded-md text-center">
                            No features drawn
                        </div>
                    ) : (
                        features.map(f => (
                            <div
                                key={f.id}
                                onClick={() => setSelectedFeatureId(f.id)}
                                className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-sm transition-colors ${selectedFeatureId === f.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-muted-foreground/30'}`}
                            >
                                <div className="flex items-center space-x-2 truncate">
                                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: f.color || '#ccc' }} />
                                    <span className="truncate flex-1 font-medium">{f.type}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteFeature(f.id); }}
                                    className="p-1 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                    title="Delete shape"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
