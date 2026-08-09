import { TinyBrow } from 'vitcv';

export const Default = () => (
    <TinyBrow>Reprojection error</TinyBrow>
);

export const Row = () => (
    <div className="flex items-center gap-4">
        <TinyBrow>Focal length</TinyBrow>
        <TinyBrow>Principal point</TinyBrow>
        <TinyBrow>Skew</TinyBrow>
    </div>
);

export const AboveValue = () => (
    <div>
        <TinyBrow>Board size</TinyBrow>
        <p className="mt-0.5 text-sm text-foreground">9 × 6 squares</p>
    </div>
);
