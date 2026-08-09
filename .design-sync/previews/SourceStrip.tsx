import { SourceStrip } from 'vitcv';

export const ZhangPlanarCalibration = () => (
    <div style={{ width: 560 }}>
        <SourceStrip primary="zhang2000-flexible" />
    </div>
);

export const SuperPoint = () => (
    <div style={{ width: 560 }}>
        <SourceStrip primary="detone2018-superpoint" />
    </div>
);

export const DaniilidisHandEye = () => (
    <div style={{ width: 560 }}>
        <SourceStrip primary="daniilidis1999-hand-eye" />
    </div>
);
