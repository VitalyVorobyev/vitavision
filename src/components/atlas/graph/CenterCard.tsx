// CenterCard — compact focused-node card at the layout's center. Details
// live in FocusedEntryPanel; this card is just the canvas anchor + link to
// the full page. Extracted from GraphExplorer.tsx.

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { getFocusEntry } from "../../../lib/atlas/focusEntry.ts";
import { GG, KIND_ACCENT, KIND_LABEL, type Layout } from "../../../lib/atlas/graphLayout.ts";
import { EntryIcon } from "../EntryIcon.tsx";
import { shortTitle } from "../../../lib/atlas/graphNeighbors.ts";

export interface CenterCardProps {
    slug:   string;
    layout: Layout;
}

export function CenterCard({ slug, layout }: CenterCardProps) {
    const entry = getFocusEntry(slug);
    if (!entry) return null;

    const { node, kind, fm } = entry;
    const year = (fm as { year?: number }).year;

    return (
        <Link
            to={node.path}
            aria-label={`Open ${node.title}`}
            className="absolute group cursor-pointer rounded-xl border-2 border-border-strong bg-surface shadow-[0_12px_32px_-12px_rgba(15,23,42,0.22)] flex items-center gap-2.5 px-3 transition-colors hover:border-brand overflow-hidden"
            style={{
                left:   layout.cx - GG.centerW / 2,
                top:    layout.cy - GG.centerH / 2,
                width:  GG.centerW,
                height: GG.centerH,
            }}
        >
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: KIND_ACCENT[kind] }} />
            <ArrowUpRight
                size={14}
                className="absolute top-2 right-2 text-muted-foreground group-hover:text-foreground transition-colors"
            />
            <EntryIcon slug={slug} kind={kind} size={28} />
            <div className="min-w-0 flex-1">
                <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground leading-none mb-0.5">
                    {KIND_LABEL[kind]}
                    {year != null && (
                        <> · <span className="font-mono normal-case tracking-normal">{year}</span></>
                    )}
                </div>
                <div className="text-[13px] font-semibold text-foreground leading-tight">
                    {shortTitle(node.title)}
                </div>
            </div>
        </Link>
    );
}
