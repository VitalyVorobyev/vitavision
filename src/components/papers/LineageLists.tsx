import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { shortAuthorList } from "../../lib/atlas/paperView.ts";
import type { LineageEntry } from "./LineageStrip.tsx";

const SHOWN_BY_DEFAULT = 7;

interface LineageColumnEntry extends LineageEntry {
    authors: string[];
}

interface LineageColumnProps {
    label: string;
    accentClass: string;
    entries: LineageColumnEntry[];
}

function LineageColumn({ label, accentClass, entries }: LineageColumnProps) {
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? entries : entries.slice(0, SHOWN_BY_DEFAULT);
    const hiddenCount = entries.length - shown.length;

    return (
        <div>
            <div className={`pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-[0.12em] ${accentClass}`}>
                {label} · {entries.length}
            </div>
            {shown.map((entry) => (
                <Link
                    key={entry.id}
                    to={`/papers/${entry.id}`}
                    className="grid grid-cols-[40px_minmax(0,1fr)] gap-2.5 border-t border-border py-[7px] no-underline transition-colors hover:bg-muted/40"
                >
                    <span className="pt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                        {entry.year}
                    </span>
                    <span className="flex flex-col gap-px min-w-0">
                        <span className="line-clamp-2 font-serif text-[15px] leading-[1.3] text-foreground">
                            {entry.title}
                        </span>
                        {entry.authors.length > 0 && (
                            <span className="truncate text-[12px] text-muted-foreground">
                                {shortAuthorList(entry.authors)}
                            </span>
                        )}
                    </span>
                </Link>
            ))}
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex h-10 w-full items-center gap-1.5 border-t border-border text-[13px] font-medium text-foreground"
                >
                    Show all {entries.length}
                    <ChevronRight size={14} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

interface LineageListsProps {
    cites: LineageColumnEntry[];
    citedBy: LineageColumnEntry[];
}

/** The two "Builds on" / "Built upon by" columns under the lineage strip. */
export default function LineageLists({ cites, citedBy }: LineageListsProps) {
    return (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
            <LineageColumn label="Builds on" accentClass="text-muted-foreground" entries={cites} />
            <LineageColumn label="Built upon by" accentClass="text-[hsl(var(--lineage-out))]" entries={citedBy} />
        </div>
    );
}
