export default function Editor() {
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
            {/* Sidebar Tool panel */}
            <div className="w-64 border-r border-border bg-muted/20 p-4 space-y-4">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Tools</h2>
                <div className="space-y-2">
                    {["Select", "Point", "Directed Feature", "Line", "Bounding Box", "Ellipse"].map((tool) => (
                        <button key={tool} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted font-medium transition-colors">
                            {tool}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-muted/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwbDhfOG0wXzgtOF8wIiBzdHJva2U9IiNlNWU3ZWIiIC8+Cjwvc3ZnPg==')" }} />
                <p className="text-muted-foreground relative z-10 p-4 bg-background border border-border shadow-sm rounded-lg">Canvas Workspace (Coming Soon)</p>
            </div>

            {/* Properties Panel */}
            <div className="w-72 border-l border-border bg-muted/20 p-4 space-y-4">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Properties</h2>
                <div className="text-sm text-muted-foreground border border-border border-dashed p-4 rounded-md text-center">
                    No feature selected
                </div>
            </div>
        </div>
    );
}
