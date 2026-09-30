import { Tooltip } from 'vitcv';

export const Default = () => (
    <Tooltip content="Detects chessboard corners with sub-pixel refinement">
        <button className="rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-fg">
            Run detector
        </button>
    </Tooltip>
);

export const OnIconButton = () => (
    <Tooltip content="Reprojection RMS: 0.184 px across 14 views">
        <button
            aria-label="Reprojection error"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line font-mono text-xs text-fg-muted"
        >
            i
        </button>
    </Tooltip>
);
