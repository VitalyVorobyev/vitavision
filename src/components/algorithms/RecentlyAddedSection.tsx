import EntryCard from "./EntryCard.tsx";
import { catalogGridClass } from "./catalogGridClass.ts";
import type { UnifiedEntry } from "../../lib/atlas/unifiedGroups.ts";

export default function RecentlyAddedSection({ entries, layout }: { entries: UnifiedEntry[]; layout: "grid" | "list" }) {
    const gridClass = catalogGridClass(layout);
    return (
        <section className="mb-6 pb-5 border-b border-[hsl(var(--border)/0.4)]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2.5 mb-3">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
                    Recently added
                </span>
                <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">{entries.length}</span>
            </h2>
            <div className={gridClass}>
                {entries.map((entry) => (
                    <EntryCard key={entry.slug} entry={entry} layout={layout} />
                ))}
            </div>
        </section>
    );
}
