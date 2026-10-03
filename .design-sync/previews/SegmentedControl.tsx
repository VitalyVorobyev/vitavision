import { useState } from 'react';
import { SegmentedControl, Field } from 'vitcv';

export const TwoOptions = () => {
    const [v, setV] = useState('landscape');
    return (
        <SegmentedControl
            aria-label="Orientation"
            value={v}
            onValueChange={setV}
            options={[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
            ]}
        />
    );
};

export const ThreeOptions = () => {
    const [v, setV] = useState('a4');
    return (
        <SegmentedControl
            aria-label="Paper size"
            value={v}
            onValueChange={setV}
            options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: 'Letter' },
                { value: 'custom', label: 'Custom' },
            ]}
        />
    );
};

// `""` means unset: the segment matching `defaultValue` is highlighted, and choosing it
// reports `""` again, so the default stays defined in one place.
export const WithDefault = () => {
    const [v, setV] = useState('');
    return (
        <div className="flex flex-col items-start gap-2">
            <SegmentedControl
                aria-label="Profile"
                value={v}
                defaultValue="baseline"
                onValueChange={setV}
                options={[
                    { value: 'baseline', label: 'Baseline' },
                    { value: 'extended', label: 'Extended' },
                ]}
            />
            <span className="font-mono text-[11px] text-fg-muted">value: {JSON.stringify(v)}</span>
        </div>
    );
};

export const InField = () => {
    const [v, setV] = useState('mm');
    return (
        <div style={{ width: 260 }}>
            <Field label="Units" as="group" description="Applies to every length in the form.">
                <SegmentedControl
                    aria-label="Units"
                    value={v}
                    onValueChange={setV}
                    options={[
                        { value: 'mm', label: 'mm' },
                        { value: 'in', label: 'in' },
                    ]}
                />
            </Field>
        </div>
    );
};

export const Disabled = () => (
    <SegmentedControl
        aria-label="Orientation"
        value="portrait"
        onValueChange={() => {}}
        disabled
        options={[
            { value: 'portrait', label: 'Portrait' },
            { value: 'landscape', label: 'Landscape' },
        ]}
    />
);
