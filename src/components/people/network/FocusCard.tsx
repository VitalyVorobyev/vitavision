// FocusCard — details panel for the currently focused person. Top-right on
// desktop; a bottom-sheet-style card on phones (full width, anchored low).

import { Link } from "react-router";
import { ArrowRight, X } from "lucide-react";
import type { CoauthorTie } from "../../../lib/atlas/peopleNetwork.ts";

export interface FocusCardProps {
    id: string;
    name: string;
    paperCount: number;
    pageCount: number;
    ties: CoauthorTie[];
    /** Ties the label budget left unlabelled on the ring — still drawn, just
     *  not statically labelled (see `splitFocusTieLabels`). Revealed one at a
     *  time via hover (mouse) or tap (touch); this count tells the reader
     *  they exist at all. */
    unlabelledCount: number;
    nameOf: (id: string) => string;
    isPhone: boolean;
    onClose: () => void;
}

export function FocusCard({ id, name, paperCount, pageCount, ties, unlabelledCount, nameOf, isPhone, onClose }: FocusCardProps) {
    const strongest = ties.slice(0, 3);

    return (
        <div
            className={
                isPhone
                    ? "absolute inset-x-2 bottom-2 rounded-panel border border-line bg-surface shadow-lg p-4 flex flex-col gap-2"
                    : "absolute right-3 top-3 w-72 rounded-panel border border-line bg-surface shadow-lg p-4 flex flex-col gap-2"
            }
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wide text-fg-muted">Focused</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Clear focus"
                    className="w-8 h-8 -m-1.5 grid place-items-center rounded-control text-fg-muted hover:text-fg hover:bg-line/60"
                >
                    <X size={16} />
                </button>
            </div>
            <span className="text-lg font-bold text-fg leading-tight">{name}</span>
            <span className="text-xs text-fg-muted">
                {paperCount} {paperCount === 1 ? "paper" : "papers"} · {pageCount} Atlas {pageCount === 1 ? "page" : "pages"} ·{" "}
                {ties.length} co-{ties.length === 1 ? "author" : "authors"}
            </span>
            {strongest.length > 0 && (
                <span className="text-sm text-fg leading-relaxed">
                    Strongest ties: {strongest.map((t, i) => (
                        <span key={t.id}>
                            {i > 0 && ", "}
                            {nameOf(t.id)} ({t.shared})
                        </span>
                    ))}
                </span>
            )}
            {unlabelledCount > 0 && (
                <span className="text-xs text-fg-muted leading-relaxed">
                    +{unlabelledCount} more co-{unlabelledCount === 1 ? "author" : "authors"} — hover or tap to see names
                </span>
            )}
            <Link
                to={`/authors/${id}`}
                className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-control border border-line bg-surface text-sm font-medium text-fg hover:bg-line/60 transition-colors"
            >
                Open profile <ArrowRight size={14} />
            </Link>
        </div>
    );
}
