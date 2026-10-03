import { useState } from 'react';
import { Select, Field } from 'vitcv';

const DICTS = [
    { value: 'DICT_4X4_250', label: 'DICT_4X4_250', note: '250 markers' },
    { value: 'DICT_5X5_250', label: 'DICT_5X5_250', note: '250 markers' },
    { value: 'DICT_6X6_250', label: 'DICT_6X6_250', note: '250 markers' },
    { value: 'DICT_APRILTAG_36h11', label: 'AprilTag 36h11', note: 'not available', disabled: true },
];

export const Unset = () => {
    const [value, setValue] = useState('');
    return (
        <div style={{ width: 240 }}>
            <Select
                aria-label="ArUco dictionary"
                value={value}
                onValueChange={setValue}
                options={DICTS}
                placeholder="Choose a dictionary…"
            />
        </div>
    );
};

export const Chosen = () => {
    const [value, setValue] = useState('DICT_4X4_250');
    return (
        <div style={{ width: 240 }}>
            <Select aria-label="ArUco dictionary" value={value} onValueChange={setValue} options={DICTS} />
        </div>
    );
};

// `unsetLabel` adds a leading entry that returns the field to `""`.
export const WithUnsetEntry = () => {
    const [value, setValue] = useState('');
    return (
        <div style={{ width: 240 }}>
            <Select
                aria-label="Preset"
                value={value}
                onValueChange={setValue}
                options={DICTS.slice(0, 3)}
                unsetLabel="No preset"
                placeholder="No preset"
            />
        </div>
    );
};

export const InField = () => {
    const [value, setValue] = useState('DICT_5X5_250');
    return (
        <div style={{ width: 260 }}>
            <Field label="Dictionary" description="Marker family printed on the board.">
                <Select value={value} onValueChange={setValue} options={DICTS} />
            </Field>
        </div>
    );
};

export const Disabled = () => (
    <div style={{ width: 240 }}>
        <Select aria-label="ArUco dictionary" value="DICT_4X4_250" onValueChange={() => {}} options={DICTS} disabled />
    </div>
);
