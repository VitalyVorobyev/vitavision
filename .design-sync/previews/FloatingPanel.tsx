import { FloatingPanel, TinyBrow } from 'vitcv';

export const Default = () => (
    <div
        className="relative w-64 rounded-panel border border-line bg-ground/60"
        style={{ height: 160 }}
    >
        <FloatingPanel className="absolute top-3 left-3 p-3">
            <TinyBrow>Zoom</TinyBrow>
            <p className="mt-1 text-sm font-mono text-fg">142%</p>
        </FloatingPanel>
    </div>
);

export const CanvasOverlayHint = () => (
    <div
        className="relative w-64 rounded-panel border border-line bg-ground/60"
        style={{ height: 160 }}
    >
        <FloatingPanel className="absolute bottom-3 right-3 px-3 py-2">
            <p className="text-xs text-fg-muted">
                Hold <span className="text-fg font-mono">Space</span> to pan
            </p>
        </FloatingPanel>
    </div>
);

export const CornerCoordinates = () => (
    <div
        className="relative w-64 rounded-panel border border-line bg-ground/60"
        style={{ height: 160 }}
    >
        <FloatingPanel className="absolute top-3 right-3 px-3 py-2">
            <TinyBrow>Cursor</TinyBrow>
            <p className="mt-0.5 text-xs font-mono text-fg">x: 963.2, y: 541.7</p>
        </FloatingPanel>
    </div>
);
