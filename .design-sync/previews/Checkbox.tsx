import { useState } from 'react';
import { Checkbox } from 'vitcv';

export const Labelled = () => {
    const [on, setOn] = useState(true);
    return <Checkbox checked={on} onCheckedChange={setOn} label="Show scale line" />;
};

export const WithDescription = () => {
    const [on, setOn] = useState(false);
    return (
        <div style={{ width: 280 }}>
            <Checkbox
                checked={on}
                onCheckedChange={setOn}
                label="Include cut marks"
                description="Adds registration ticks at the corners of the printed area."
            />
        </div>
    );
};

// A partial selection over a set: a click resolves it to checked.
export const Indeterminate = () => {
    const [state, setState] = useState<boolean | 'indeterminate'>('indeterminate');
    return (
        <Checkbox
            checked={state}
            onCheckedChange={setState}
            label="Select all corners (12 of 42)"
        />
    );
};

export const Disabled = () => (
    <div className="flex flex-col gap-2">
        <Checkbox checked onCheckedChange={() => {}} label="Refine sub-pixel" disabled />
        <Checkbox checked={false} onCheckedChange={() => {}} label="Export DXF" disabled />
    </div>
);

// Without a label it is a bare box: name it with aria-label (e.g. in a table row).
export const BareBox = () => {
    const [on, setOn] = useState(false);
    return <Checkbox checked={on} onCheckedChange={setOn} aria-label="Select row" />;
};
