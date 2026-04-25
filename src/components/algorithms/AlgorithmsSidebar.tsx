import AlgorithmTagChip from "./AlgorithmTagChip.tsx";
import type { AlgorithmsFilters, AlgorithmsKind, FacetCounts } from "../../hooks/useAlgorithmsFilters.ts";

interface Props {
    filters: AlgorithmsFilters;
    facets: FacetCounts;
    categoryValues: readonly string[];
    categoryLabel: (id: string) => string;
    popularTags: string[];
    tagSet: string[];
    onKindChange: (k: AlgorithmsKind) => void;
    onCategoryChange: (id: string) => void;
    onTagToggle: (tag: string) => void;
    onOpenTagPicker: () => void;
}

function SectionLabel({
    label,
    rightSlot,
}: {
    label: string;
    rightSlot?: React.ReactNode;
}) {
    return (
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2.5 flex justify-between items-center">
            <span>{label}</span>
            {rightSlot}
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

export default function AlgorithmsSidebar({
    filters,
    facets,
    categoryValues,
    categoryLabel,
    popularTags,
    tagSet,
    onKindChange,
    onCategoryChange,
    onTagToggle,
    onOpenTagPicker,
}: Props) {
    return (
        <aside className="w-[220px] shrink-0 border-r border-[hsl(var(--border)/0.38)] py-5 pl-[22px] pr-[18px] text-[13px]">
            {/* Kind section */}
            <div className="mb-[22px]">
                <SectionLabel label="Kind" />
                <div
                    role="radiogroup"
                    aria-label="Kind"
                    className="flex flex-col gap-1"
                >
                    <button
                        type="button"
                        role="radio"
                        aria-checked={filters.kind === "classical"}
                        onClick={() => onKindChange("classical")}
                        className={`flex justify-between items-center px-2 py-[5px] rounded-[5px] w-full text-left text-[13px] transition-colors ${
                            filters.kind === "classical"
                                ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                        }`}
                    >
                        <span>Classical</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                            {facets.kinds.classical}
                        </span>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={filters.kind === "models"}
                        onClick={() => onKindChange("models")}
                        className={`flex justify-between items-center px-2 py-[5px] rounded-[5px] w-full text-left text-[13px] transition-colors ${
                            filters.kind === "models"
                                ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--surface-hi)/0.5)]"
                        }`}
                    >
                        <span>Models</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                            {facets.kinds.models}
                        </span>
                    </button>
                </div>
            </div>

            {/* Category section */}
            <div className="mb-[22px]">
                <SectionLabel label="Category" />
                <div
                    role="radiogroup"
                    aria-label="Category"
                    className="flex flex-col gap-0.5"
                >
                    <SidebarRow
                        label="All"
                        count={facets.categories["all"] ?? 0}
                        active={filters.categoryId === "all"}
                        onClick={() => onCategoryChange("all")}
                    />
                    {categoryValues
                        .filter(
                            (id) =>
                                (facets.categories[id] ?? 0) > 0 ||
                                filters.categoryId === id,
                        )
                        .map((id) => (
                            <SidebarRow
                                key={id}
                                label={categoryLabel(id)}
                                count={facets.categories[id] ?? 0}
                                active={filters.categoryId === id}
                                onClick={() => onCategoryChange(id)}
                            />
                        ))}
                </div>
            </div>

            {/* Tags section */}
            <div>
                <SectionLabel
                    label="Tags"
                    rightSlot={
                        <button
                            type="button"
                            onClick={onOpenTagPicker}
                            className="normal-case tracking-normal font-normal text-brand text-[11px] hover:underline"
                        >
                            all {tagSet.length} →
                        </button>
                    }
                />
                <div className="flex flex-wrap gap-1.5">
                    {popularTags.map((t) => (
                        <AlgorithmTagChip
                            key={t}
                            tag={t}
                            active={filters.tags.includes(t)}
                            compact
                            onToggle={onTagToggle}
                        />
                    ))}
                </div>
            </div>
        </aside>
    );
}
