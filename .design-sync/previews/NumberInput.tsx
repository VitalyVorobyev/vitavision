import { useState } from 'react';
import { NumberInput, Field } from 'vitcv';

// Always controlled with text (`value` is a string): that is what the DOM holds while the
// user types "1." or "-". The app converts at the seam with `numberInputProps`
// (src/lib/fieldBindings.ts).
function Bound({ initial, ...rest }: {
    initial: string;
    unit?: string;
    min?: number;
    step?: number;
    disabled?: boolean;
    'aria-label'?: string;
}) {
    const [v, setV] = useState(initial);
    return <NumberInput value={v} onChange={(e) => setV(e.target.value)} {...rest} />;
}

export const Plain = () => (
    <div style={{ width: 160 }}>
        <Bound initial="14" aria-label="Views" min={1} step={1} />
    </div>
);

export const WithUnit = () => (
    <div style={{ width: 180 }}>
        <Bound initial="20" aria-label="Square size" unit="mm" min={1} step={0.5} />
    </div>
);

export const Degrees = () => (
    <div style={{ width: 180 }}>
        <Bound initial="-0.2814" aria-label="Angle" unit="°" step={0.01} />
    </div>
);

export const InField = () => (
    <div style={{ width: 240 }}>
        <Field label="Marker radius" description="Outer radius of a ring marker.">
            <Bound initial="5.6" unit="mm" min={0.1} step={0.1} />
        </Field>
    </div>
);

export const Disabled = () => (
    <div style={{ width: 180 }}>
        <Bound initial="300" aria-label="PNG resolution" unit="dpi" disabled />
    </div>
);
