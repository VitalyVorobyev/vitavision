import { ErrorBoundary } from 'vitcv';

function Cracked() {
    throw new Error('WASM module failed to decode the charuco board layout');
    return null;
}

export const DefaultFallback = () => (
    <div className="w-80">
        <ErrorBoundary>
            <Cracked />
        </ErrorBoundary>
    </div>
);

export const CustomFallback = () => (
    <div className="w-80">
        <ErrorBoundary
            fallback={
                <div className="rounded-control border border-defect/30 bg-defect/5 p-4 text-sm text-defect">
                    Detector crashed — try a different algorithm or reload the image.
                </div>
            }
        >
            <Cracked />
        </ErrorBoundary>
    </div>
);

export const HealthyChildren = () => (
    <div className="w-80">
        <ErrorBoundary>
            <div className="rounded-control border border-line bg-surface p-4">
                <p className="text-sm text-fg">Ring-grid detector</p>
                <p className="mt-1 text-xs text-fg-muted">32 rings detected, 0 outliers.</p>
            </div>
        </ErrorBoundary>
    </div>
);
