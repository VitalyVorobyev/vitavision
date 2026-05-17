import AlgorithmTagChip from "./AlgorithmTagChip.tsx";
import type { AlgorithmsFilters, AlgorithmsKind, FacetCounts } from "../../hooks/useAlgorithmsFilters.ts";
import { domainLabels, domainOrder } from "./domainLabels.ts";
import { taskOrder, taskLabel } from "../../lib/content/taskLabels.ts";

interface Props {
    filters: AlgorithmsFilters;
    facets: FacetCounts;
    tagSet: string[];
    onKindChange: (k: AlgorithmsKind) => void;
    onCategoryChange: (id: string) => void;
    onTagToggle: (tag: string) => void;
    onProblemChange: (id: string) => void;
    /** Currently scroll-spied domain id (without the "domain-" prefix). */
    activeDomain: string | null;
    /** Ordered list of domain ids that have visible entries (without "domain-" prefix). */
    visibleDomains: string[];
    /** Jump-scroll to a domain, or null to scroll to top. */
    onJumpToDomain: (domainId: string | null) => void;
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

function SidebarRow({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    const activeClasses =
        "bg-[hsl(var(--surface-hi))] text-foreground font-semibold";
    const inactiveClasses =
        "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]";

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex justify-between items-center px-2 py-[5px] rounded-[5px] w-full text-left text-[13px] transition-colors ${
                active ? activeClasses : inactiveClasses
            }`}
        >
            <span>{label}</span>
            <span className="text-[11px] text-muted-foreground font-normal">
                {count}
            </span>
        </button>
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
    tagSet,
    onKindChange,
    onCategoryChange,
    onTagToggle,
    onProblemChange,
    activeDomain,
    visibleDomains,
    onJumpToDomain,
}: Props) {
    return (
        <aside className="w-[220px] shrink-0 border-r border-[hsl(var(--border)/0.38)] py-5 pl-[22px] pr-[18px] text-[13px]">
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

            {/* Problem section — between Type and Domains */}
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

            {/* Domain jump-rail — always visible, pure navigation */}
            <div className="mb-[22px]">
                <SectionLabel label="Domains" />
                <nav aria-label="Jump to domain" className="flex flex-col gap-0.5">
                    {/* All domains — scrolls to top */}
                    <SidebarRow
                        label="All domains"
                        count={facets.categories["all"] ?? 0}
                        active={activeDomain === null || !visibleDomains.includes(activeDomain ?? "")}
                        onClick={() => {
                            // When a domain filter is active, clicking "All domains" resets it
                            if (filters.categoryId !== "all") {
                                onCategoryChange("all");
                            } else {
                                onJumpToDomain(null);
                            }
                        }}
                    />
                    {domainOrder
                        .filter((dom) => (facets.categories[dom] ?? 0) > 0)
                        .map((dom) => (
                            <SidebarRow
                                key={dom}
                                label={domainLabels[dom as keyof typeof domainLabels] ?? dom}
                                count={facets.categories[dom] ?? 0}
                                active={activeDomain === dom && filters.categoryId === "all"}
                                onClick={() => {
                                    if (filters.categoryId !== "all") {
                                        // Reset domain filter first, then jump
                                        onCategoryChange("all");
                                        // Schedule scroll after re-render
                                        setTimeout(() => onJumpToDomain(dom), 50);
                                    } else {
                                        onJumpToDomain(dom);
                                    }
                                }}
                            />
                        ))}
                </nav>
            </div>

            {/* Tags section — all tags inline */}
            <div>
                <SectionLabel label="Tags" />
                <div className="flex flex-wrap gap-1.5">
                    {tagSet.map((t) => (
                        <AlgorithmTagChip
                            key={t}
                            tag={t}
                            active={filters.tags.includes(t)}
                            count={facets.tags[t]}
                            compact
                            onToggle={onTagToggle}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
}
