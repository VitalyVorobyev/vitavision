import { LayoutGrid, Network, BookOpen, Users, FileText } from "lucide-react";
import type { AlgorithmsView } from "../../hooks/useAlgorithmsFilters.ts";
import { readStoredCatalogLayout } from "../../lib/atlas/atlasFilters.ts";

/** The five Atlas views the tab switch navigates between. "grid" stands in
 *  for the whole Catalog tab — Catalog covers both `view=grid` and
 *  `view=list`; the grid/list choice itself lives in a secondary toggle
 *  inside the catalog view (sidebar on desktop, filter sheet on mobile). */
type TabKey = "grid" | "graph" | "narratives" | "people" | "papers";

const TABS: { key: TabKey; label: string; Icon: typeof LayoutGrid }[] = [
    { key: "grid",       label: "Catalog",    Icon: LayoutGrid },
    { key: "graph",      label: "Graph",      Icon: Network },
    { key: "narratives", label: "Narratives", Icon: BookOpen },
    { key: "people",     label: "People",     Icon: Users },
    { key: "papers",     label: "Papers",     Icon: FileText },
];

function isCatalog(view: AlgorithmsView): boolean {
    return view === "grid" || view === "list";
}

interface AtlasViewTabsProps {
    view: AlgorithmsView;
    onChange: (view: AlgorithmsView) => void;
    /** Compact equal-width 5-column layout (icon over a small label) — used
     *  below the desktop breakpoint. Both variants keep 44px-tall targets. */
    compact?: boolean;
}

/**
 * The 5-tab Atlas view switch — Catalog · Graph · Narratives · People ·
 * Papers. Replaces the old 4-icon `AlgorithmsViewToggle`; every 44px-tall
 * target fixes BL-035 (icon-only 19px touch targets).
 */
export default function AtlasViewTabs({ view, onChange, compact = false }: AtlasViewTabsProps) {
    const handleSelect = (key: TabKey) => {
        onChange(key === "grid" ? readStoredCatalogLayout() : key);
    };

    return (
        <div
            role="tablist"
            aria-label="Atlas views"
            className={`inline-flex gap-0.5 rounded-lg border border-border bg-surface p-[3px] ${compact ? "w-full" : ""}`}
        >
            {TABS.map(({ key, label, Icon }) => {
                const active = key === "grid" ? isCatalog(view) : view === key;
                return (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-current={active ? "page" : undefined}
                        onClick={() => handleSelect(key)}
                        className={`flex h-11 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                            compact ? "flex-1 flex-col gap-0.5 text-[10.5px]" : "gap-1.5 px-3.5"
                        } ${
                            active
                                ? "bg-[hsl(var(--surface-hi))] font-semibold text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Icon size={compact ? 17 : 15} aria-hidden="true" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
