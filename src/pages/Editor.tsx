import CanvasWorkspace from "../components/editor/CanvasWorkspace";
import { useEditorStore, type ToolType, type Feature } from "../store/editor/useEditorStore";

export default function Editor() {
    const { activeTool, setActiveTool, selectedFeatureId, features, setFeatures } = useEditorStore();

    const tools: { id: ToolType; label: string }[] = [
        { id: 'SELECT', label: 'Select' },
        { id: 'POINT', label: 'Point' },
        { id: 'LINE', label: 'Line' },
        { id: 'POLYLINE', label: 'Polyline' },
        { id: 'BBOX', label: 'Bounding Box' },
        { id: 'ELLIPSE', label: 'Ellipse' },
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

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
            {/* Sidebar Tool panel */}
            <div className="w-64 border-r border-border bg-muted/20 p-4 flex flex-col">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Tools</h2>
                <div className="space-y-2 flex-1">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-colors ${activeTool === tool.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                }`}
                        >
                            {tool.label}
                        </button>
                    ))}
                </div>

                <div className="mt-8 border-t border-border pt-4">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Actions</h2>
                    <button onClick={handleImport} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted font-medium transition-colors">
                        Import JSON
                    </button>
                    <button onClick={handleExport} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted font-medium transition-colors">
                        Export JSON
                    </button>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOGm0XzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMTgxODE4IiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiMyODI4MjgiIC8+Cjwvc3ZnPg==')]">
                <CanvasWorkspace />
            </div>

            {/* Properties Panel */}
            <div className="w-72 border-l border-border bg-muted/20 p-4 space-y-4">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Properties</h2>
                {selectedFeatureId ? (
                    <div className="text-sm p-4 rounded-md border border-border bg-background shadow-sm">
                        Playing with Feature: <span className="font-mono text-primary">{selectedFeatureId}</span>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground border border-border border-dashed p-4 rounded-md text-center">
                        No feature selected
                    </div>
                )}
            </div>
        </div>
    );
}
