// MobileGraphView — below-lg focused-entry hero card + grouped neighbor
// lists (the mobile shape of the graph explorer). Extracted from
// GraphExplorer.tsx.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { contentGraph } from "../../../generated/content-graph.ts";
import { entryMeta, getFocusEntry } from "../../../lib/atlas/focusEntry.ts";
import { shortTitle } from "../../../lib/atlas/graphNeighbors.ts";
import { usePaperById } from "../../../lib/atlas/usePaperById.ts";
import { taskLabel } from "../../../lib/content/taskLabels.ts";
import { categorize, KIND_ACCENT, KIND_LABEL, LANES_V3, REL_M } from "../../../lib/atlas/graphLayout.ts";
import { domainLabels } from "../../algorithms/domainLabels.ts";
import TagBadge from "../../blog/TagBadge.tsx";
import { EntryIcon } from "../EntryIcon.tsx";

// ── MobileNeighborRow ─────────────────────────────────────────────────────────

interface MobileNeighborRowProps {
    slug:    string;
    onClick: (slug: string) => void;
}

function MobileNeighborRow({ slug, onClick }: MobileNeighborRowProps) {
    const node = contentGraph.nodes[slug];
    if (!node) return null;

    const { kind, year } = entryMeta(slug);

    const rowDomain = getFocusEntry(slug)?.fm?.domain as string | undefined;
    const rowDomainLabel = rowDomain ? (domainLabels[rowDomain as keyof typeof domainLabels] ?? undefined) : undefined;

    return (
        <button
            type="button"
            onClick={() => onClick(slug)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-surface border border-border rounded-lg text-left active:bg-muted relative overflow-hidden"
        >
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: KIND_ACCENT[kind] }} />
            <EntryIcon slug={slug} kind={kind} size={32} />
            <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-foreground leading-tight truncate -tracking-[0.1px]">
                    {shortTitle(node.title)}
                </div>
                <div className="text-[10.5px] text-muted-foreground uppercase tracking-[0.06em] truncate mt-0.5">
                    {rowDomainLabel ?? KIND_LABEL[kind]}
                    {year != null && (
                        <> · <span className="font-mono normal-case tracking-normal">{year}</span></>
                    )}
                </div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                <polyline points="9 18 15 12 9 6" />
            </svg>
        </button>
    );
}

// ── MobileGraphView ────────────────────────────────────────────────────────────

export interface MobileGraphViewProps {
    history:   string[];
    current:   string;
    onBack:    () => void;
    onNavigate: (slug: string) => void;
}

export function MobileGraphView({ history, current, onBack, onNavigate }: MobileGraphViewProps) {
    const node = contentGraph.nodes[current];
    const entry = getFocusEntry(current);
    const kind = entry?.kind ?? "concept";
    const fm = entry?.fm;

    // Primary source citation
    const primarySourceId = (fm as { sources?: { primary?: string } } | undefined)?.sources?.primary;
    const paper = usePaperById(primarySourceId);

    const cat = useMemo(() => categorize(current), [current]);

    if (!node || !fm || !cat) return null;

    const tagline = (fm as { tagline?: string }).tagline;
    const bodyText = tagline ?? node.summary.slice(0, 200);
    const tasks = (fm as { tasks?: string[] }).tasks ?? [];
    const year = (fm as { year?: number }).year;
    const heroDomain = fm.domain as string | undefined;
    const heroDomainLabel = heroDomain ? (domainLabels[heroDomain as keyof typeof domainLabels] ?? undefined) : undefined;
    const heroTags = (fm.tags as string[] | undefined) ?? [];

    let citationText: string | null = null;
    if (paper) {
        const firstAuthor = paper.authors?.[0] ?? "";
        const surname = firstAuthor.includes(",")
            ? firstAuthor.split(",")[0].trim()
            : firstAuthor.split(" ").at(-1) ?? firstAuthor;
        const parts = [surname, paper.venue, paper.year].filter(Boolean).join(" · ");
        citationText = parts || null;
    } else if (primarySourceId && !primarySourceId.startsWith("repo:") && !primarySourceId.startsWith("doc:")) {
        citationText = primarySourceId;
    }

    const totalNeighbors = LANES_V3.reduce((n, r) => n + cat[r].length, 0);

    // Trail — capped at 3 visible + +N earlier
    const TRAIL_MAX = 3;
    const hidden  = Math.max(0, history.length - TRAIL_MAX);
    const visible = history.slice(-TRAIL_MAX);

    const nodeTitle = (slug: string): string => {
        const n = contentGraph.nodes[slug];
        return n ? shortTitle(n.title) : slug;
    };

    return (
        <div className="flex flex-col min-h-0">
            {/* Trail breadcrumb */}
            {history.length > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-muted-foreground overflow-x-auto shrink-0 bg-bg-soft border border-border rounded-lg mb-3">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={history.length === 0}
                        className={`w-7 h-7 grid place-items-center rounded shrink-0 ${
                            history.length > 0
                                ? "text-foreground active:bg-muted"
                                : "text-muted-foreground/60"
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="font-mono uppercase tracking-wider text-[9px] text-muted-foreground/60 mr-1 shrink-0">Trail</span>
                    {hidden > 0 && (
                        <>
                            <span className="text-[10px] font-mono text-muted-foreground/60 whitespace-nowrap">+{hidden} earlier</span>
                            <span className="text-muted-foreground/60">·</span>
                        </>
                    )}
                    {visible.map((s, i) => (
                        <span key={`m-${s}-${i}`} className="contents">
                            <span className="text-foreground whitespace-nowrap">{nodeTitle(s)}</span>
                            <span className="text-muted-foreground/60">›</span>
                        </span>
                    ))}
                    <span className="text-foreground font-semibold whitespace-nowrap">{nodeTitle(current)}</span>
                </div>
            )}

            {/* Focused entry hero card */}
            <div className="rounded-xl border-2 border-border-strong bg-surface p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] relative overflow-hidden">
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: KIND_ACCENT[kind] }} />
                <div className="flex items-start gap-3">
                    <EntryIcon slug={current} kind={kind} size={44} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                            <span className="text-brand font-semibold">Focused</span>
                            <span className="text-muted-foreground/60">·</span>
                            <span>{KIND_LABEL[kind]}</span>
                            {year != null && (
                                <><span className="text-muted-foreground/60">·</span><span className="font-mono normal-case tracking-normal">{year}</span></>
                            )}
                        </div>
                        <div className="text-[16px] font-semibold leading-tight text-foreground -tracking-[0.2px] mt-0.5">
                            {node.title}
                        </div>
                    </div>
                </div>
                <p className="text-[12.5px] text-foreground leading-[1.5] mt-3">
                    {bodyText}
                </p>
                {citationText && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-muted-foreground">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
                            <path d="M4 12h12" />
                        </svg>
                        <span className="font-mono truncate">{citationText}</span>
                    </div>
                )}
                {heroDomainLabel && (
                    <div className="mt-3">
                        <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground mb-1">Domain</div>
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-muted text-muted-foreground">
                            {heroDomainLabel}
                        </span>
                    </div>
                )}
                {tasks.length > 0 && (
                    <div className="mt-3">
                        <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground mb-1">Problems</div>
                        <div className="flex flex-wrap gap-1.5">
                            {tasks.slice(0, 3).map((t) => (
                                <span key={t} className="inline-flex items-center h-[20px] px-2 rounded-[3px] border border-brand/40 bg-brand/10 text-[10.5px] text-brand">
                                    {taskLabel(t)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {heroTags.length > 0 && (
                    <div className="mt-3">
                        <div className="text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground mb-1">Tags</div>
                        <div className="flex flex-wrap gap-1.5">
                            {heroTags.map((t) => (
                                <TagBadge
                                    key={t}
                                    tag={t}
                                    to={`/atlas?tags=${encodeURIComponent(t)}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
                <Link
                    to={node.path}
                    className="mt-4 flex items-center justify-center h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 active:opacity-90"
                >
                    Open page →
                </Link>
            </div>

            {/* Neighbor sections */}
            <div className="mt-5 flex items-baseline justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Related · {totalNeighbors}
                </h2>
                <span className="text-[10.5px] text-muted-foreground">tap to navigate</span>
            </div>

            {LANES_V3.map((rel) => {
                const list = cat[rel];
                if (!list.length) return null;
                const meta = REL_M[rel];
                return (
                    <section key={rel} className="mt-3">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: meta.color }}>
                                {meta.label}
                            </span>
                            <span className="text-[10.5px] text-muted-foreground/60 tabular-nums ml-auto">{list.length}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {list.map((s) => (
                                <MobileNeighborRow key={`${rel}-${s}`} slug={s} onClick={onNavigate} />
                            ))}
                        </div>
                    </section>
                );
            })}

            <p className="mt-6 mb-2 px-1 text-[10.5px] text-muted-foreground leading-snug">
                The visual graph from desktop is reshaped into a list here. Same data, same
                navigation — tap any entry to recenter, back arrow in the trail to backtrack.
            </p>
        </div>
    );
}
