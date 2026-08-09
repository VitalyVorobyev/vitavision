import { DifficultyBadge } from 'vitcv';

export const Levels = () => (
    <div className="flex flex-wrap items-center gap-4">
        <DifficultyBadge level="beginner" />
        <DifficultyBadge level="intermediate" />
        <DifficultyBadge level="advanced" />
    </div>
);

export const InArticleMeta = () => (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Corner Detection with the Harris Response</span>
        <span aria-hidden="true">·</span>
        <DifficultyBadge level="intermediate" />
    </div>
);

export const AlgorithmCardRow = () => (
    <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-foreground">Zhang's Planar Calibration</span>
            <DifficultyBadge level="beginner" />
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-foreground">Hand-Eye Calibration (Tsai-Lenz)</span>
            <DifficultyBadge level="advanced" />
        </div>
    </div>
);
