import { LayoutGrid, List, LayoutDashboard, Workflow } from "lucide-react";
import type { AlgorithmsView } from "../../hooks/useAlgorithmsFilters.ts";

interface AlgorithmsViewToggleProps {
    view: AlgorithmsView;
    onChange: (view: AlgorithmsView) => void;
    /** When true, surface Map and Constellation buttons. Public viewers see only Grid/List. */
    showExperimental?: boolean;
}

const BASE_BUTTONS: { view: AlgorithmsView; label: string; Icon: typeof LayoutGrid }[] = [
    { view: "grid", label: "Grid view", Icon: LayoutGrid },
    { view: "list", label: "List view", Icon: List },
];

const EXPERIMENTAL_BUTTONS: { view: AlgorithmsView; label: string; Icon: typeof LayoutGrid }[] = [
    { view: "map",           label: "Map view (experimental)",           Icon: LayoutDashboard },
    { view: "constellation", label: "Constellation view (experimental)", Icon: Workflow },
];

export default function AlgorithmsViewToggle({ view, onChange, showExperimental = false }: AlgorithmsViewToggleProps) {
    const buttons = showExperimental ? [...BASE_BUTTONS, ...EXPERIMENTAL_BUTTONS] : BASE_BUTTONS;
    return (
        <div
            role="radiogroup"
            aria-label="Atlas view"
            className="flex gap-0.5 p-0.5 rounded-md border border-[hsl(var(--border)/0.7)]"
        >
            {buttons.map(({ view: v, label, Icon }) => {
                const active = view === v;
                return (
                    <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={label}
                        onClick={() => onChange(v)}
                        className={`p-[3px] rounded transition-colors ${
                            active
                                ? "bg-[hsl(var(--surface-hi))] text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Icon size={13} />
                    </button>
                );
            })}
        </div>
    );
}
