import { MetricCell } from 'vitcv';

export const Tones = () => (
    <div className="grid grid-cols-4 gap-2">
        <MetricCell label="Neutral" value="128" />
        <MetricCell label="Good" value="0.184 px" tone="good" />
        <MetricCell label="Warn" value="3 views" tone="warn" />
        <MetricCell label="Bad" value="FAILED" tone="bad" />
    </div>
);

export const CalibrationSummary = () => (
    <div className="grid grid-cols-3 gap-2">
        <MetricCell label="RMS reproj" value="0.184 px" tone="good" />
        <MetricCell label="Views" value="14" />
        <MetricCell label="Corners" value="1 204" />
        <MetricCell label="Outliers" value="7" tone="warn" />
        <MetricCell label="Focal fx" value="1432.8" />
        <MetricCell label="Skew" value="0.0" />
    </div>
);

export const LongValue = () => (
    <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 280 }}>
        <MetricCell label="Principal point" value="(963.2, 541.7)" />
        <MetricCell label="Distortion k1" value="-0.2814" tone="good" />
    </div>
);
