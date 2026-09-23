import { LayoutGrid, List } from "lucide-react";
import type { AlgorithmsFilters, AlgorithmsKind, AlgorithmsView, FacetCounts } from "../../hooks/useAlgorithmsFilters.ts";
import { taskOrder, taskLabel } from "../../lib/content/taskLabels.ts";

interface Props {
    filters: AlgorithmsFilters;
    facets: FacetCounts;
    onKindChange: (k: AlgorithmsKind) => void;
    onProblemChange: (id: string) => void;
    /** Catalog-only secondary toggle — grid vs. list layout. */
    layout: "grid" | "list";
    onLayoutChange: (view: AlgorithmsView) => void;
}

function SectionLabel({
    label,
}: {
    label: string;
}) {
    return (
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2.5">
            <span>{label}</span>
        </div>
    );
}

const KIND_ITEMS: { key: AlgorithmsKind; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "algorithm", label: "Algorithms" },
    { key: "model",     label: "Models" },
    { key: "concept",   label: "Concepts" },
];

export default function AlgorithmsSidebar({
    filters,
    facets,
    onKindChange,
    onProblemChange,
    layout,
    onLayoutChange,
}: Props) {
    return (
        <aside className="w-[220px] shrink-0 border-r border-[hsl(var(--border)/0.38)] py-5 pl-[22px] pr-[18px] text-[13px]">
            {/* Layout section — grid vs. list, secondary to the Catalog tab */}
            <div className="mb-[22px]">
                <SectionLabel label="Layout" />
                <div
                    role="radiogroup"
                    aria-label="Layout"
                    className="grid grid-cols-2 gap-1"
                >
                    {(
                        [
                            ["grid", "Grid", LayoutGrid],
                            ["list", "List", List],
                        ] as const
                    ).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={layout === key}
                            onClick={() => onLayoutChange(key)}
                            className={`flex items-center justify-center gap-1.5 rounded-[5px] py-[7px] text-[12.5px] transition-colors ${
                                layout === key
                                    ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                    : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                            }`}
                        >
                            <Icon size={13} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kind section */}
            <div className="mb-[22px]">
                <SectionLabel label="Type" />
                <div
                    role="radiogroup"
                    aria-label="Type"
                    className="flex flex-col gap-1"
                >
                    {KIND_ITEMS.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={filters.kind === key}
                            onClick={() => onKindChange(key)}
                            className={`flex justify-between items-center px-2 py-[5px] rounded-[5px] w-full text-left text-[13px] transition-colors ${
                                filters.kind === key
                                    ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                    : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                            }`}
                        >
                            <span>{label}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                                {facets.kinds[key]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Problem section */}
            <div className="mb-[22px]">
                <SectionLabel label="Problem" />
                <div role="radiogroup" aria-label="Problem" className="flex flex-col gap-0.5">
                    {/* All problems row */}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={filters.problem === "all"}
                        onClick={() => onProblemChange("all")}
                        className={`flex justify-between items-center px-2 py-[5px] rounded-[5px] w-full text-left text-[13px] transition-colors ${
                            filters.problem === "all"
                                ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                        }`}
                    >
                        <span>All problems</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                            {facets.kinds[filters.kind]}
                        </span>
                    </button>
                    {taskOrder
                        .filter((task) => (facets.problems[task] ?? 0) > 0)
                        .map((task) => {
                            const active = filters.problem === task;
                            return (
                                <button
                                    key={task}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => onProblemChange(task)}
                                    className={`flex justify-between items-center px-2 py-[5px] rounded-[5px] w-full text-left text-[12.5px] transition-colors ${
                                        active
                                            ? "bg-[hsl(191_70%_94%)] text-[hsl(191_55%_22%)] font-medium"
                                            : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                                    }`}
                                >
                                    <span className="truncate">{taskLabel(task)}</span>
                                    <span className={`text-[11px] font-normal ml-2 shrink-0 ${active ? "text-[hsl(191_55%_22%)]" : "text-muted-foreground"}`}>
                                        {facets.problems[task]}
                                    </span>
                                </button>
                            );
                        })}
                </div>
            </div>
        </aside>
    );
}
