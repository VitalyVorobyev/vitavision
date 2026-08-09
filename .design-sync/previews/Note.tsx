import { Note } from 'vitcv';

export const Default = () => (
    <Note>
        Increasing the board tilt beyond 45° tends to raise corner localization error.
    </Note>
);

export const InEditorHint = () => (
    <div className="w-64 space-y-2">
        <p className="text-sm text-foreground">Ring-grid detector</p>
        <Note>
            Requires at least 8 rings visible in-frame for a stable homography estimate.
        </Note>
    </div>
);

export const ShortWarning = () => (
    <Note>Homography residual above 1.0 px — consider re-capturing this view.</Note>
);
