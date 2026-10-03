import { useState } from 'react';
import { Button } from 'vitcv';

export const Variants = () => (
    <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary">Run detector</Button>
        <Button variant="secondary">Import config</Button>
        <Button variant="ghost">Reset view</Button>
        <Button variant="danger">Clear features</Button>
    </div>
);

export const Sizes = () => (
    <div className="flex items-center gap-2">
        <Button variant="primary" size="md">Comfortable</Button>
        <Button variant="primary" size="sm">Compact</Button>
    </div>
);

export const States = () => (
    <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" loading>Detecting</Button>
        <Button variant="secondary" disabled>Download SVG</Button>
        <Button variant="secondary" aria-pressed>Pressed</Button>
    </div>
);

export const WithIcon = () => (
    <Button
        variant="primary"
        icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M8 2v8m0 0L5 7m3 3 3-3M3 13h10" />
            </svg>
        }
    >
        Download
    </Button>
);

export const AsLink = () => (
    <Button asChild variant="secondary">
        <a href="#atlas">Open the Atlas</a>
    </Button>
);

export const InToolbar = () => {
    const [runs, setRuns] = useState(0);
    return (
        <div
            className="flex items-center justify-between rounded-panel border border-line bg-surface px-3 py-2"
            style={{ width: 360 }}
        >
            <span className="font-mono text-xs text-fg-muted">{runs} runs</span>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setRuns(0)}>Reset</Button>
                <Button variant="primary" onClick={() => setRuns((n) => n + 1)}>Run</Button>
            </div>
        </div>
    );
};
