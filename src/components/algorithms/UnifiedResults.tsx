import EntryCard from "./EntryCard.tsx";
import { SectionHeader, MobileSectionHeader } from "./SectionHeader.tsx";
import { catalogGridClass } from "./catalogGridClass.ts";
import type { CatalogGroup } from "../../lib/atlas/unifiedGroups.ts";

interface UnifiedResultsProps {
    groups: CatalogGroup[];
    layout: "grid" | "list";
    isMobile?: boolean;
}

/** Unified grouped catalog results — one section per group, in order. */
export default function UnifiedResults({ groups, layout, isMobile = false }: UnifiedResultsProps) {
    const gridClass = catalogGridClass(layout);

    if (groups.length === 0) {
        return (
            <p className="text-[13px] text-muted-foreground py-6">
                No entries match the current filters.
            </p>
        );
    }

    return (
        <>
            {groups.map(({ id, label, entries }) => (
                <div key={id}>
                    {isMobile ? (
                        <MobileSectionHeader label={label} count={entries.length} />
                    ) : (
                        <SectionHeader label={label} count={entries.length} />
                    )}
                    <div className={`${gridClass} mt-3`}>
                        {entries.map((entry) => (
                            <EntryCard key={entry.slug} entry={entry} layout={layout} />
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}
