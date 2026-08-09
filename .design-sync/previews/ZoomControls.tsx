import { ZoomControls } from 'vitcv';

const noop = () => {};

export const Default = () => (
    <div className="relative rounded-lg border border-border bg-muted" style={{ width: 320, height: 160 }}>
        <div className="absolute top-3 right-3">
            <ZoomControls
                onZoomIn={noop}
                onZoomOut={noop}
                onFit={noop}
                onActual={noop}
                zoomPercent={142}
            />
        </div>
    </div>
);

export const TouchFriendly = () => (
    <div className="relative rounded-lg border border-border bg-muted" style={{ width: 320, height: 160 }}>
        <div className="absolute top-3 right-3">
            <ZoomControls
                onZoomIn={noop}
                onZoomOut={noop}
                onFit={noop}
                onActual={noop}
                zoomPercent={100}
                touchFriendly
            />
        </div>
    </div>
);

export const WithoutPercentLabel = () => (
    <div className="relative rounded-lg border border-border bg-muted" style={{ width: 320, height: 160 }}>
        <div className="absolute top-3 right-3">
            <ZoomControls onZoomIn={noop} onZoomOut={noop} onFit={noop} onActual={noop} />
        </div>
    </div>
);
