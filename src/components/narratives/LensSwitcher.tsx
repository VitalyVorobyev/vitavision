import { SegmentedControl } from "@vitavision/ui";
import type { NarrativeLens } from "../../lib/content/schema.ts";

interface LensSwitcherProps {
    lenses: NarrativeLens[];
    activeId: string;
    onChange: (id: string) => void;
}

/** Segmented control selecting which authored (or build-generated) layout the canvas draws. */
export default function LensSwitcher({ lenses, activeId, onChange }: LensSwitcherProps) {
    if (lenses.length < 2) return null;

    return (
        <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted mr-1">
                Lens
            </span>
            <SegmentedControl
                aria-label="Layout"
                value={activeId}
                options={lenses.map((lens) => ({ value: lens.id, label: lens.title }))}
                onValueChange={onChange}
            />
        </div>
    );
}
