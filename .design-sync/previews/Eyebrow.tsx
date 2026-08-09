import { Eyebrow } from 'vitcv';

export const Default = () => (
    <Eyebrow>Camera calibration</Eyebrow>
);

export const AbovePanelHeading = () => (
    <div>
        <Eyebrow>ChArUco board</Eyebrow>
        <h3 className="mt-1 text-lg font-semibold text-foreground">Marker detection results</h3>
    </div>
);

export const Row = () => (
    <div className="flex items-center gap-3">
        <Eyebrow>Intrinsics</Eyebrow>
        <Eyebrow>Extrinsics</Eyebrow>
        <Eyebrow>Distortion</Eyebrow>
    </div>
);
