import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@vitavision/ui";

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
                "absolute z-20 rounded-control border border-line bg-surface/90 px-2.5 py-1.5 text-[11px] leading-relaxed text-fg-muted shadow-xs backdrop-blur-sm",
                className,
            )}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <div className="text-fg font-medium">Controls</div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="-mt-0.5 -mr-1 size-5 px-0"
                    aria-label="Close controls"
                    onClick={() => setDismissed(true)}
                    icon={<X />}
                />
            </div>
            {lines.map((line) => (
                <div key={line}>{line}</div>
            ))}
        </div>
    );
}
