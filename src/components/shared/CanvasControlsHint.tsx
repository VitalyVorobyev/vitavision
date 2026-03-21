import { useState } from "react";
import { X } from "lucide-react";

import { classNames } from "../../utils/helpers";

interface CanvasControlsHintProps {
    lines: string[];
    className?: string;
}

export default function CanvasControlsHint({ lines, className }: CanvasControlsHintProps) {
    const [dismissed, setDismissed] = useState(false);

    if (lines.length === 0 || dismissed) {
        return null;
    }

    return (
        <div
            className={classNames(
                "absolute z-20 rounded-md border border-border bg-background/90 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground shadow-xs backdrop-blur-sm",
                className,
            )}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <div className="text-foreground/80 font-medium">Controls</div>
                <button
                    type="button"
                    aria-label="Close controls"
                    onClick={() => setDismissed(true)}
                    className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                    <X size={12} />
                </button>
            </div>
            {lines.map((line) => (
                <div key={line}>{line}</div>
            ))}
        </div>
    );
}
