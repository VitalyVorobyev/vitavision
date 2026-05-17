// Shared building blocks for the three Atlas catalog cards (Algorithm / Model /
// Concept). Extracted so the cards stay thin and the graph chip + relation line
// have a single implementation.

import { Link } from "react-router-dom";
import { getNeighbors, shortTitle } from "../../lib/atlas/graphNeighbors.ts";
import { contentGraph } from "../../generated/content-graph.ts";
import { KIND_TEXT_CLASSES, KIND_LABEL } from "./cardText.ts";

/** Reader-visible warning that a page is an unpublished draft. */
export function DraftBadge() {
    return (
        <span className="inline-block text-[9px] font-bold tracking-wider uppercase bg-[hsl(var(--border))] text-foreground px-1.5 py-px rounded-[3px] mr-1.5 align-[1px]">
            DRAFT
        </span>
    );
}

/**
 * Top-right chip that opens the Graph Explorer focused on this entry.
 * `relative z-[1]` keeps it clickable above the card's stretched title link;
 * `stopPropagation` prevents the card click from also firing.
 */
export function GraphChip({ slug }: { slug: string }) {
    return (
        <Link
            to={`/atlas?view=graph&focus=${slug}`}
            className="relative z-[1] shrink-0 w-6 h-6 grid place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-brand hover:border-brand/40 hover:bg-brand/10"
            title="Open in graph explorer"
            aria-label="Open in graph explorer"
            onClick={(e) => e.stopPropagation()}
        >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <circle cx="5"  cy="5"  r="1.6" />
                <circle cx="19" cy="5"  r="1.6" />
                <circle cx="5"  cy="19" r="1.6" />
                <circle cx="19" cy="19" r="1.6" />
                <line x1="7" y1="6.5" x2="10" y2="10" />
                <line x1="17" y1="6.5" x2="14" y2="10" />
                <line x1="7" y1="17.5" x2="10" y2="14" />
                <line x1="17" y1="17.5" x2="14" y2="14" />
            </svg>
        </Link>
    );
}

/**
 * `KIND · PROBLEM · YEAR` meta row. Renders the `·` separator only between
 * present items; renders nothing when all three are absent.
 */
export function CardMeta({ kind, label, year }: { kind?: "algorithm" | "model" | "concept"; label?: string; year?: number }) {
    if (!kind && !label && year === undefined) return null;
    return (
        <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-muted-foreground uppercase tracking-[0.06em]">
            {kind && (
                <span className={KIND_TEXT_CLASSES[kind]}>{KIND_LABEL[kind]}</span>
            )}
            {kind && (label || year !== undefined) && <span className="text-muted-foreground/60">·</span>}
            {label && <span className="truncate">{label}</span>}
            {label && year !== undefined && <span className="text-muted-foreground/60">·</span>}
            {year !== undefined && (
                <span className="font-mono tabular-nums normal-case tracking-normal">{year}</span>
            )}
        </div>
    );
}

/**
 * Bottom relation line: `→ extended by A · B · C +N`. Prefers the `extended_by`
 * bucket, falls back to `compared_with`. Each name links to the target's
 * canonical `/atlas/<slug>` page (kind-agnostic — a relation target may be an
 * algorithm, model, or concept).
 */
export function RelationLine({ slug }: { slug: string }) {
    const neighbors = getNeighbors(slug);
    if (!neighbors) return null;

    const { extended_by, compared_with } = neighbors;
    const [label, targetSlugs] =
        extended_by.length > 0 ? (["extended by", extended_by] as const)
        : compared_with.length > 0 ? (["compared with", compared_with] as const)
        : (["", [] as string[]] as const);

    if (targetSlugs.length === 0) return null;

    const shown = targetSlugs.slice(0, 3);
    const extra = targetSlugs.length - shown.length;

    return (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
            <span className="font-mono text-muted-foreground/70 shrink-0">→</span>
            <span className="shrink-0">{label}</span>
            <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                {shown.map((targetSlug, i) => {
                    const title = contentGraph.nodes[targetSlug]?.title ?? targetSlug;
                    return (
                        <span key={targetSlug} className="flex items-center gap-1">
                            <Link
                                to={`/atlas?view=graph&focus=${targetSlug}`}
                                className="relative z-[1] text-foreground font-medium truncate hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {shortTitle(title)}
                            </Link>
                            {i < shown.length - 1 && (
                                <span className="text-muted-foreground/50">·</span>
                            )}
                        </span>
                    );
                })}
                {extra > 0 && (
                    <span className="text-muted-foreground/70 shrink-0">+{extra}</span>
                )}
            </span>
        </div>
    );
}
