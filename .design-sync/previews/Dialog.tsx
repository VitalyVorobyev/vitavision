import { useState } from 'react';
import { Dialog, Button, Field, NumberInput } from 'vitcv';

// Dialog is a modal portalled to <body> with a dimmed backdrop, and it is controlled, so a
// card can show the open state directly. There is deliberately one story: a second open
// (or closed-with-backdrop) cell would be dimmed by this one's overlay.
export const Open = () => {
    const [open, setOpen] = useState(true);
    return (
        <>
            <Button variant="secondary" onClick={() => setOpen(true)}>Export…</Button>
            <Dialog
                open={open}
                onOpenChange={setOpen}
                title="Export target"
                description="Choose the raster resolution for the PNG. The SVG is always vector."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => setOpen(false)}>Export</Button>
                    </>
                }
            >
                <div className="mt-4">
                    <Field label="PNG resolution" annotation="dpi">
                        <NumberInput value="300" onChange={() => {}} min={72} step={50} />
                    </Field>
                </div>
            </Dialog>
        </>
    );
};
