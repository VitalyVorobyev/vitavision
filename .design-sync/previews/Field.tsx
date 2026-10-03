import { useState } from 'react';
import { Field, NumberInput, Select, SegmentedControl, InfoHint } from 'vitcv';

export const WithDescription = () => {
    const [v, setV] = useState('20');
    return (
        <div style={{ width: 260 }}>
            <Field label="Square size" description="Edge length of one printed square." annotation="mm">
                <NumberInput value={v} onChange={(e) => setV(e.target.value)} min={1} step={0.5} />
            </Field>
        </div>
    );
};

export const Required = () => {
    const [v, setV] = useState('7');
    return (
        <div style={{ width: 260 }}>
            <Field label="Inner rows" required description="Interior corners down the board.">
                <NumberInput value={v} onChange={(e) => setV(e.target.value)} min={2} step={1} />
            </Field>
        </div>
    );
};

export const WithError = () => {
    const [v, setV] = useState('500');
    return (
        <div style={{ width: 260 }}>
            <Field label="Square size" error="Board does not fit the printable area of an A4 sheet.">
                <NumberInput value={v} onChange={(e) => setV(e.target.value)} min={1} unit="mm" />
            </Field>
        </div>
    );
};

// A control that is not a text field (a segmented control, a set of radios) is labelled as
// a group: `<label>` cannot label it. A help mark goes in `annotation`, never inside the label.
export const AsGroup = () => {
    const [v, setV] = useState('landscape');
    return (
        <div style={{ width: 280 }}>
            <Field
                label="Orientation"
                as="group"
                annotation={<InfoHint label="About orientation">Landscape fits wider boards on A4.</InfoHint>}
            >
                <SegmentedControl
                    aria-label="Orientation"
                    value={v}
                    onValueChange={setV}
                    options={[
                        { value: 'portrait', label: 'Portrait' },
                        { value: 'landscape', label: 'Landscape' },
                    ]}
                />
            </Field>
        </div>
    );
};

export const FormGrid = () => {
    const [rows, setRows] = useState('7');
    const [cols, setCols] = useState('10');
    const [size, setSize] = useState('20');
    const [kind, setKind] = useState('chessboard');
    return (
        <div className="grid grid-cols-2 gap-3" style={{ width: 340 }}>
            <Field label="Rows"><NumberInput value={rows} onChange={(e) => setRows(e.target.value)} min={2} /></Field>
            <Field label="Columns"><NumberInput value={cols} onChange={(e) => setCols(e.target.value)} min={2} /></Field>
            <Field label="Square size"><NumberInput value={size} onChange={(e) => setSize(e.target.value)} unit="mm" /></Field>
            <Field label="Target">
                <Select
                    aria-label="Target"
                    value={kind}
                    onValueChange={setKind}
                    options={[
                        { value: 'chessboard', label: 'Chessboard' },
                        { value: 'charuco', label: 'ChArUco' },
                    ]}
                />
            </Field>
        </div>
    );
};
