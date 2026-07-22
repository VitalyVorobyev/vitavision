import { Tooltip } from 'vitcv';

export const Default = () => (
    <Tooltip content="Detects chessboard corners with sub-pixel refinement">
        <button className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
            Run detector
        </button>
    </Tooltip>
);

export const Sides = () => (
    <div className="flex items-center gap-4 p-6">
        <Tooltip content="Pans the canvas" side="top">
            <span className="rounded-md border border-border px-2 py-1 text-xs text-foreground">Top</span>
        </Tooltip>
        <Tooltip content="Zooms to fit the image" side="bottom">
            <span className="rounded-md border border-border px-2 py-1 text-xs text-foreground">Bottom</span>
        </Tooltip>
        <Tooltip content="Toggles the heatmap overlay" side="left">
            <span className="rounded-md border border-border px-2 py-1 text-xs text-foreground">Left</span>
        </Tooltip>
    </div>
);

export const OnIconButton = () => (
    <Tooltip content="Reprojection RMS: 0.184 px across 14 views" delayDuration={100}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs font-mono text-muted-foreground">
            i
        </span>
    </Tooltip>
);
