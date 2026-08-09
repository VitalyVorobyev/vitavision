import { CanvasControlsHint } from 'vitcv';

export const EditorCanvasHints = () => (
    <div className="relative rounded-lg border border-border bg-muted" style={{ width: 320, height: 160 }}>
        <CanvasControlsHint
            lines={["Left click selects or edits", "Right drag pans", "Wheel zooms"]}
            className="bottom-4 right-4 max-w-52"
        />
    </div>
);

export const TargetGeneratorHints = () => (
    <div className="relative rounded-lg border border-border bg-muted" style={{ width: 320, height: 160 }}>
        <CanvasControlsHint
            lines={["Right drag pans", "Wheel zooms"]}
            className="bottom-3 right-3 max-w-52"
        />
    </div>
);
