import type { NarrativeLens } from "../../lib/content/schema.ts";

interface LensSwitcherProps {
    lenses: NarrativeLens[];
    activeId: string;
    onChange: (id: string) => void;
}

/** Pill row selecting which authored (or build-generated) layout the canvas draws. */
export default function LensSwitcher({ lenses, activeId, onChange }: LensSwitcherProps) {
    if (lenses.length < 2) return null;

    return (
        <div role="radiogroup" aria-label="Layout" className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mr-1">
                Lens
            </span>
            {lenses.map((lens) => {
                const active = lens.id === activeId;
                return (
                    <button
                        key={lens.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(lens.id)}
                        className={`rounded-full border px-2.5 py-[3px] text-[11.5px] transition-colors ${
                            active
                                ? "border-border-strong bg-[hsl(var(--surface-hi))] text-foreground font-medium"
                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        {lens.title}
                    </button>
                );
            })}
        </div>
    );
}
