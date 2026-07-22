import { Pill } from 'vitcv';

export const Default = () => (
    <Pill>chessboard</Pill>
);

export const StatusRow = () => (
    <div className="flex flex-wrap gap-2">
        <Pill>ready</Pill>
        <Pill>14 views</Pill>
        <Pill>0.184 px RMS</Pill>
    </div>
);

export const WithIcon = () => (
    <Pill>
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Detector active
    </Pill>
);

export const AlgorithmTags = () => (
    <div className="flex flex-wrap gap-2">
        <Pill>Harris</Pill>
        <Pill>Shi-Tomasi</Pill>
        <Pill>FAST</Pill>
        <Pill>ORB</Pill>
    </div>
);
