import { DemoThumbnail } from 'vitcv';

export const Default = () => (
    <div className="w-80 rounded-lg overflow-hidden border border-border">
        <DemoThumbnail />
    </div>
);

export const Compact = () => (
    <div className="w-40 rounded-md overflow-hidden border border-border">
        <DemoThumbnail />
    </div>
);

export const InDemoCard = () => (
    <div className="w-64 rounded-lg border border-border overflow-hidden">
        <DemoThumbnail />
        <div className="p-3 border-t border-border space-y-1">
            <p className="text-sm font-semibold text-foreground">RANSAC line fitting</p>
            <p className="text-xs text-muted-foreground">Interactive outlier-rejection demo — no cover art authored yet.</p>
        </div>
    </div>
);
