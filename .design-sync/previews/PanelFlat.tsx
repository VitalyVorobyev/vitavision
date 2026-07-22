import { PanelFlat, Eyebrow, Pill } from 'vitcv';

export const Default = () => (
    <PanelFlat className="p-4 w-64">
        <Eyebrow>Feature detector</Eyebrow>
        <p className="mt-2 text-sm text-foreground">
            Harris corner response computed over the 3×3 structure tensor window.
        </p>
    </PanelFlat>
);

export const ToolPaletteRow = () => (
    <PanelFlat className="p-3 w-64 flex items-center justify-between">
        <span className="text-sm text-foreground">Ring-grid target</span>
        <Pill>ready</Pill>
    </PanelFlat>
);

export const AsListItem = () => (
    <PanelFlat as="li" className="p-3 w-64 list-none">
        <p className="text-xs font-mono text-muted-foreground">chessboard-corners.json</p>
        <p className="mt-1 text-sm text-foreground">9×6 internal corners, 54 points</p>
    </PanelFlat>
);

export const CompareToPanel = () => (
    <div className="flex gap-3">
        <PanelFlat className="p-3 w-40 text-center">
            <p className="text-xs text-muted-foreground">Flat surface</p>
        </PanelFlat>
        <PanelFlat className="p-3 w-40 text-center bg-surface">
            <p className="text-xs text-muted-foreground">No gradient</p>
        </PanelFlat>
    </div>
);
