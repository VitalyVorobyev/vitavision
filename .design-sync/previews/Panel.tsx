import { Panel, Eyebrow, MetricCell } from 'vitcv';

export const Default = () => (
    <Panel className="p-4 w-64">
        <Eyebrow>Calibration run</Eyebrow>
        <p className="mt-2 text-sm text-foreground">
            Zhang planar calibration converged after 14 views with sub-pixel corner refinement.
        </p>
    </Panel>
);

export const WithMetrics = () => (
    <Panel className="p-4 w-64 space-y-3">
        <Eyebrow>Reprojection summary</Eyebrow>
        <div className="grid grid-cols-2 gap-2">
            <MetricCell label="RMS reproj" value="0.184 px" tone="good" />
            <MetricCell label="Views" value="14" />
        </div>
    </Panel>
);

export const AsSection = () => (
    <Panel as="section" className="p-5 w-80">
        <h3 className="text-sm font-semibold text-foreground">ChArUco board detection</h3>
        <p className="mt-1.5 text-xs text-muted-foreground">
            5×7 board, 32 markers found, 0 rejected. Homography residual below threshold.
        </p>
    </Panel>
);

export const Nested = () => (
    <Panel className="p-4 w-64">
        <Eyebrow>Distortion model</Eyebrow>
        <div className="mt-2 rounded-[1rem] border border-border bg-background/60 p-3">
            <p className="text-xs font-mono text-muted-foreground">
                k1 = -0.2814, k2 = 0.0932, p1 = 0.0004
            </p>
        </div>
    </Panel>
);
