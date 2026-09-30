import { DemoThumbnail } from 'vitcv';

export const Default = () => (
    <div className="w-80 rounded-panel overflow-hidden border border-line">
        <DemoThumbnail />
    </div>
);

export const Compact = () => (
    <div className="w-40 rounded-control overflow-hidden border border-line">
        <DemoThumbnail />
    </div>
);

export const InDemoCard = () => (
    <div className="w-64 rounded-panel border border-line overflow-hidden">
        <DemoThumbnail />
        <div className="p-3 border-t border-line space-y-1">
            <p className="text-sm font-semibold text-fg">RANSAC line fitting</p>
            <p className="text-xs text-fg-muted">Interactive outlier-rejection demo — no cover art authored yet.</p>
        </div>
    </div>
);
