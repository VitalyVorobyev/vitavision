import { InfoHint, Field, NumberInput } from 'vitcv';

export const Default = () => <InfoHint>Squares are measured edge to edge on the printed sheet.</InfoHint>;

export const BesideALabel = () => (
    <div className="flex items-center gap-1.5 text-sm text-fg">
        <span>Seam row</span>
        <InfoHint label="About seam row">
            Master-pattern row the strip is cut from. Each listed row closes seamlessly for this circumference.
        </InfoHint>
    </div>
);

// A help mark inside a `Field` goes in `annotation`; a button must not sit inside the
// field's <label>, so a control with a mark is a `Field as="group"` with an aria-label.
export const InFieldAnnotation = () => (
    <div style={{ width: 260 }}>
        <Field
            label="Quiet zone"
            as="group"
            annotation={<InfoHint label="About the quiet zone">White margin the detector needs around the pattern.</InfoHint>}
        >
            <NumberInput aria-label="Quiet zone" value="5" onChange={() => {}} unit="mm" />
        </Field>
    </div>
);
