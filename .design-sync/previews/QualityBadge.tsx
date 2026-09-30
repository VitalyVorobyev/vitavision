import { QualityBadge } from 'vitcv';

export const Stub = () => <QualityBadge quality="stub" />;

export const Canonical = () => <QualityBadge quality="canonical" />;

export const Historical = () => <QualityBadge quality="historical" />;

export const InPageHeader = () => (
    <div className="flex items-center gap-2 rounded-panel border border-line bg-surface px-4 py-3">
        <h3 className="m-0 font-serif text-base font-semibold text-fg">
            Zhang's Planar Calibration
        </h3>
        <QualityBadge quality="canonical" />
    </div>
);
