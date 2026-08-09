import { Kbd } from 'vitcv';

export const Keys = () => (
    <div className="flex flex-wrap items-center gap-2">
        <Kbd>Shift</Kbd>
        <Kbd>Ctrl</Kbd>
        <Kbd>Alt</Kbd>
        <Kbd>Space</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>⌘</Kbd>
    </div>
);

export const InHintText = () => (
    <div className="space-y-2 text-xs text-muted-foreground">
        <p>
            Hold <Kbd>Space</Kbd> and drag to pan the canvas.
        </p>
        <p>
            Hold <Kbd>Shift</Kbd> while dragging to constrain to an axis.
        </p>
        <p>
            Press <Kbd>Esc</Kbd> to cancel the active tool.
        </p>
    </div>
);

export const Chord = () => (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Kbd>Ctrl</Kbd>
        <span>+</span>
        <Kbd>Z</Kbd>
        <span className="ml-2">Undo the last annotation</span>
    </div>
);
