// GraphExplorer — graph view for the Atlas
//
// Above the lg breakpoint: visual graph canvas (desktop).
// Below lg: focused-entry hero card + grouped neighbor lists (mobile).
// Both shapes share the same trail state machine and navigation contract.
// Props: { focusSlug?: string }

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { searchSlugs } from "../../lib/atlas/searchClient.ts";
import useMediaQuery from "../../hooks/useMediaQuery.ts";
import { contentGraph } from "../../generated/content-graph.ts";
import { algorithmPages, modelPages, conceptPages } from "../../generated/content-index.ts";
import { getNeighbors, shortTitle } from "../../lib/atlas/graphNeighbors.ts";
import { usePaperById } from "../../lib/atlas/usePaperById.ts";
import { taskLabel } from "../../lib/content/taskLabels.ts";
import { EntryIcon } from "./EntryIcon.tsx";
import { getFocusEntry } from "../../lib/atlas/focusEntry.ts";
import { FocusedEntryPanel } from "./FocusedEntryPanel.tsx";
import { domainLabels } from "../algorithms/domainLabels.ts";
import TagBadge from "../blog/TagBadge.tsx";
import { buildEdge } from "../../lib/graph/edgeGeometry.ts";
import { graphRelColor, graphKindAccent, GRAPH_CANVAS_GRADIENT, GRAPH_PILL_BG } from "../../lib/graph/graphTheme.ts";
import { useViewport } from "../../lib/graph/useViewport.ts";
import type { ViewportBounds } from "../../lib/graph/useViewport.ts";
import { ZoomControls } from "./graph/ZoomControls.tsx";
import { NodeFinder } from "./graph/NodeFinder.tsx";
import type { NodeFinderItem } from "./graph/NodeFinder.tsx";

// ── Constants (ported verbatim from direction-2-graph.jsx) ─────────────────────

const GG = {
    canvasMinW: 1020,
    canvasMinH: 580,
    centerW:    220,
    centerH:     96,
    nodeW:      184,
    nodeH:       68,
    pad:         24,
    gap:         12,
    laneOff:     20,
    trailMaxVisible: 4,
} as const;

// ── Relation metadata (ported verbatim from direction-2-graph.jsx) ─────────────

interface RelationMeta {
    label:   string;
    short:   string;
    color:   string;
    arrow:   "in" | "out" | "none";
    dashed?: boolean;
}

const RELATION_V3: Record<string, RelationMeta> = {
    prerequisites:          { label: "builds on",              short: "prereq",   color: graphRelColor("prerequisites"),          arrow: "in"  },
    extended_from:          { label: "extended from",          short: "ext from", color: graphRelColor("extended_from"),          arrow: "in"  },
    compared_with:          { label: "compared with",          short: "vs",       color: graphRelColor("compared_with"),          arrow: "none", dashed: true },
    extended_by:            { label: "extended by",            short: "ext by",   color: graphRelColor("extended_by"),            arrow: "out" },
    feeds_into:             { label: "feeds into",             short: "feeds",    color: graphRelColor("feeds_into"),             arrow: "out" },
    learned_by:             { label: "learned alt of",         short: "learn",    color: graphRelColor("learned_by"),             arrow: "out" },
    used_by:                { label: "used by",                short: "used by",  color: graphRelColor("used_by"),                arrow: "out" },
    fed_by:                 { label: "fed by",                 short: "fed by",   color: graphRelColor("fed_by"),                 arrow: "in"  },
    learned_alternative_of: { label: "learned alternative of", short: "learns",   color: graphRelColor("learned_alternative_of"), arrow: "out" },
};

const LANES_V3 = [
    "prerequisites",
    "extended_from",
    "compared_with",
    "extended_by",
    "feeds_into",
    "learned_by",
    "used_by",
    "fed_by",
    "learned_alternative_of",
] as const;

type RelKey = typeof LANES_V3[number];

// ── Data types ─────────────────────────────────────────────────────────────────

interface PositionedNode {
    slug: string;
    rel:  RelKey;
    x:    number;
    y:    number;
}

interface Layout {
    positions: PositionedNode[];
    canvasW:   number;
    canvasH:   number;
    cx:        number;
    cy:        number;
}

interface ByRel {
    prerequisites:          string[];
    extended_from:          string[];
    compared_with:          string[];
    extended_by:            string[];
    feeds_into:             string[];
    learned_by:             string[];
    used_by:                string[];
    fed_by:                 string[];
    learned_alternative_of: string[];
}

// ── categorize_v3 ──────────────────────────────────────────────────────────────

function categorize_v3(slug: string): { byRel: ByRel } | null {
    const n = getNeighbors(slug);
    if (!n) return null;
    const seen = new Set<string>([slug]);
    const out: Partial<ByRel> = {};
    for (const rel of LANES_V3) {
        out[rel] = [];
        for (const s of (n[rel] ?? [])) {
            // Only include nodes that exist in the content graph (non-draft)
            if (seen.has(s) || !(s in contentGraph.nodes)) continue;
            seen.add(s);
            (out[rel] as string[]).push(s);
        }
    }
    return { byRel: out as ByRel };
}

// ── computeLayout ──────────────────────────────────────────────────────────────

function computeLayout(byRel: ByRel): Layout {
    const wList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.prerequisites.map((s) => ({ slug: s, rel: "prerequisites" as RelKey })),
        ...byRel.extended_from.map((s) => ({ slug: s, rel: "extended_from" as RelKey })),
        ...byRel.fed_by.map((s) => ({ slug: s, rel: "fed_by" as RelKey })),
    ];
    const eList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.extended_by.map((s) => ({ slug: s, rel: "extended_by" as RelKey })),
        ...byRel.feeds_into.map((s) => ({ slug: s, rel: "feeds_into" as RelKey })),
        ...byRel.used_by.map((s) => ({ slug: s, rel: "used_by" as RelKey })),
    ];
    const nList: Array<{ slug: string; rel: RelKey }> = byRel.compared_with.map((s) => ({ slug: s, rel: "compared_with" }));
    const sList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.learned_by.map((s) => ({ slug: s, rel: "learned_by" as RelKey })),
        ...byRel.learned_alternative_of.map((s) => ({ slug: s, rel: "learned_alternative_of" as RelKey })),
    ];

    const wrapAt = 5;
    const nRowsReal = nList.length ? Math.ceil(nList.length / wrapAt) : 0;
    const sRowsReal = sList.length ? Math.ceil(sList.length / wrapAt) : 0;

    const wHeight = wList.length * (GG.nodeH + GG.gap);
    const eHeight = eList.length * (GG.nodeH + GG.gap);
    const vNeeded = Math.max(wHeight, eHeight, GG.centerH + 80);
    const nBlock  = nRowsReal * (GG.nodeH + GG.gap) + (nRowsReal ? 40 : 0);
    const sBlock  = sRowsReal * (GG.nodeH + GG.gap) + (sRowsReal ? 40 : 0);
    const canvasH = Math.max(GG.canvasMinH, vNeeded + nBlock + sBlock + GG.pad * 2);

    const nW = Math.min(wrapAt, nList.length) * (GG.nodeW + GG.gap);
    const sW = Math.min(wrapAt, sList.length) * (GG.nodeW + GG.gap);
    const middleNeeded = Math.max(GG.centerW + 80, nW, sW);
    const canvasW = Math.max(
        GG.canvasMinW,
        middleNeeded + 2 * (GG.pad + GG.nodeW + 40),
    );

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    const positions: PositionedNode[] = [];

    // West stack
    {
        const totalH = wList.length * GG.nodeH + Math.max(0, wList.length - 1) * GG.gap;
        let y = cy - totalH / 2;
        for (const item of wList) {
            positions.push({ ...item, x: GG.pad, y });
            y += GG.nodeH + GG.gap;
        }
    }
    // East stack
    {
        const totalH = eList.length * GG.nodeH + Math.max(0, eList.length - 1) * GG.gap;
        let y = cy - totalH / 2;
        for (const item of eList) {
            positions.push({ ...item, x: canvasW - GG.pad - GG.nodeW, y });
            y += GG.nodeH + GG.gap;
        }
    }
    // North rows
    for (let r = 0; r < nRowsReal; r++) {
        const row = nList.slice(r * wrapAt, (r + 1) * wrapAt);
        const rowW = row.length * GG.nodeW + Math.max(0, row.length - 1) * GG.gap;
        let x = cx - rowW / 2;
        const y = GG.pad + r * (GG.nodeH + GG.gap);
        for (const item of row) {
            positions.push({ ...item, x, y });
            x += GG.nodeW + GG.gap;
        }
    }
    // South rows
    for (let r = 0; r < sRowsReal; r++) {
        const row = sList.slice(r * wrapAt, (r + 1) * wrapAt);
        const rowW = row.length * GG.nodeW + Math.max(0, row.length - 1) * GG.gap;
        let x = cx - rowW / 2;
        const y = canvasH - GG.pad - GG.nodeH - r * (GG.nodeH + GG.gap);
        for (const item of row) {
            positions.push({ ...item, x, y });
            x += GG.nodeW + GG.gap;
        }
    }

    return { positions, canvasW, canvasH, cx, cy };
}

// ── Edge geometry — see src/lib/graph/edgeGeometry.ts ───────────────────────────

// ── KIND_LABEL helper ──────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
    algorithm: "Algorithm",
    model:     "Model",
    concept:   "Concept",
};

const KIND_ACCENT: Record<string, string> = {
    algorithm: graphKindAccent("algorithm"),
    model:     graphKindAccent("model"),
    concept:   graphKindAccent("concept"),
};

// ── Mobile relation metadata ───────────────────────────────────────────────────

const REL_M: Record<RelKey, { label: string; color: string }> = {
    prerequisites:          { label: "Builds on",               color: graphRelColor("prerequisites")          },
    extended_from:          { label: "Extended from",           color: graphRelColor("extended_from")          },
    compared_with:          { label: "Compared with",           color: graphRelColor("compared_with")          },
    extended_by:            { label: "Extended by",             color: graphRelColor("extended_by")            },
    feeds_into:             { label: "Feeds into",              color: graphRelColor("feeds_into")             },
    learned_by:             { label: "Learned alternatives",    color: graphRelColor("learned_by")             },
    used_by:                { label: "Used by",                 color: graphRelColor("used_by")                },
    fed_by:                 { label: "Fed by",                  color: graphRelColor("fed_by")                 },
    learned_alternative_of: { label: "Learned alternative of",  color: graphRelColor("learned_alternative_of") },
};

// ── categorize_mobile — same dedup priority as desktop ────────────────────────

function categorize_mobile(slug: string): Record<RelKey, string[]> | null {
    const n = getNeighbors(slug);
    if (!n) return null;
    const seen = new Set<string>([slug]);
    const out = {} as Record<RelKey, string[]>;
    for (const rel of LANES_V3) {
        out[rel] = [];
        for (const s of (n[rel] ?? [])) {
            if (seen.has(s) || !(s in contentGraph.nodes)) continue;
            seen.add(s);
            out[rel].push(s);
        }
    }
    return out;
}

// ── MobileNeighborRow ─────────────────────────────────────────────────────────

interface MobileNeighborRowProps {
    slug:    string;
    onClick: (slug: string) => void;
}

function MobileNeighborRow({ slug, onClick }: MobileNeighborRowProps) {
    const node = contentGraph.nodes[slug];
    if (!node) return null;

    const kind: "algorithm" | "model" | "concept" =
        algorithmPages.some((p) => p.slug === slug) ? "algorithm" :
        modelPages.some((p) => p.slug === slug)     ? "model"     :
        "concept";

    const year = (() => {
        const a = algorithmPages.find((p) => p.slug === slug);
        if (a) return a.frontmatter.year;
        const m = modelPages.find((p) => p.slug === slug);
        if (m) return m.frontmatter.year;
        const c = conceptPages.find((p) => p.slug === slug);
        if (c) return c.frontmatter.year;
        return undefined;
    })();

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

interface MobileGraphViewProps {
    history:   string[];
    current:   string;
    onBack:    () => void;
    onNavigate: (slug: string) => void;
}

function MobileGraphView({ history, current, onBack, onNavigate }: MobileGraphViewProps) {
    const node = contentGraph.nodes[current];

    const kind: "algorithm" | "model" | "concept" =
        algorithmPages.some((p) => p.slug === current) ? "algorithm" :
        modelPages.some((p) => p.slug === current)     ? "model"     :
        "concept";

    const fm = (() => {
        const a = algorithmPages.find((p) => p.slug === current);
        if (a) return a.frontmatter;
        const m = modelPages.find((p) => p.slug === current);
        if (m) return m.frontmatter;
        const c = conceptPages.find((p) => p.slug === current);
        if (c) return c.frontmatter;
        return undefined;
    })();

    // Primary source citation
    const primarySourceId = fm?.sources?.primary;
    const paper = usePaperById(primarySourceId);

    const cat = useMemo(() => categorize_mobile(current), [current]);

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

// ── NeighborCardV3 ─────────────────────────────────────────────────────────────

interface NeighborCardProps {
    pos:       PositionedNode;
    isHovered: boolean;
    isDimmed:  boolean;
    onClick:   (slug: string) => void;
    onHover:   (slug: string | null) => void;
}

function NeighborCardV3({ pos, isHovered, isDimmed, onClick, onHover }: NeighborCardProps) {
    const node = contentGraph.nodes[pos.slug];
    const meta = RELATION_V3[pos.rel];

    // Determine kind from the index arrays
    const kind: "algorithm" | "model" | "concept" =
        algorithmPages.some((p) => p.slug === pos.slug) ? "algorithm" :
        modelPages.some((p) => p.slug === pos.slug)     ? "model"     :
        "concept";

    const year = (() => {
        const a = algorithmPages.find((p) => p.slug === pos.slug);
        if (a) return a.frontmatter.year;
        const m = modelPages.find((p) => p.slug === pos.slug);
        if (m) return m.frontmatter.year;
        const c = conceptPages.find((p) => p.slug === pos.slug);
        if (c) return c.frontmatter.year;
        return undefined;
    })();

    if (!node || !meta) return null;

    // Touch: pin highlight on tap (pointer-type=touch/pen), clear on second tap or tap elsewhere
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
            e.preventDefault();
            if (isHovered) {
                onHover(null);
            } else {
                onHover(pos.slug);
            }
        }
    };

    return (
        <button
            onClick={() => onClick(pos.slug)}
            onMouseEnter={() => onHover(pos.slug)}
            onMouseLeave={() => onHover(null)}
            onPointerDown={handlePointerDown}
            className={`absolute group rounded-md border bg-surface px-2.5 py-1.5 flex flex-col text-left transition-all overflow-hidden ${
                isHovered
                    ? "border-border-strong shadow-[0_6px_18px_-8px_rgba(15,23,42,0.22)]"
                    : "border-border"
            }`}
            style={{
                left:    pos.x,
                top:     pos.y,
                width:   GG.nodeW,
                height:  GG.nodeH,
                opacity: isDimmed ? 0.4 : 1,
                touchAction: "none",
            }}
        >
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: KIND_ACCENT[kind] }} />
            <div className="flex items-center gap-1.5">
                <EntryIcon slug={pos.slug} kind={kind} size={18} />
                <span className="text-[11.5px] font-semibold text-foreground truncate -tracking-[0.1px] flex-1 min-w-0">
                    {shortTitle(node.title)}
                </span>
                <span className="font-mono text-[9.5px] text-muted-foreground tabular-nums shrink-0">
                    {year ?? ""}
                </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                {(() => {
                    const nfm = getFocusEntry(pos.slug)?.fm;
                    const nDomain = nfm?.domain as string | undefined;
                    const nDomainLabel = nDomain ? domainLabels[nDomain as keyof typeof domainLabels] : undefined;
                    return nDomainLabel ? (
                        <span className="text-[9.5px] text-muted-foreground truncate">
                            {nDomainLabel}
                        </span>
                    ) : null;
                })()}
                <span className="ml-auto inline-flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.short}
                    </span>
                </span>
            </div>
        </button>
    );
}

// ── CenterCardV3 — compact node (details now in FocusedEntryPanel) ─────────────

interface CenterCardProps {
    slug:   string;
    layout: Layout;
}

function CenterCardV3({ slug, layout }: CenterCardProps) {
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

// ── EdgesLayerV3 ───────────────────────────────────────────────────────────────

interface EdgesLayerProps {
    positions:  PositionedNode[];
    layout:     Layout;
    hoverSlug:  string | null;
}

function EdgesLayerV3({ positions, layout, hoverSlug }: EdgesLayerProps) {
    const centerBox = { x: layout.cx - GG.centerW / 2, y: layout.cy - GG.centerH / 2, w: GG.centerW, h: GG.centerH };

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.canvasW}
            height={layout.canvasH}
            viewBox={`0 0 ${layout.canvasW} ${layout.canvasH}`}
        >
            <defs>
                {Object.entries(RELATION_V3).map(([k, m]) => (
                    <marker
                        key={`mk-${k}`}
                        id={`arr-${k}`}
                        viewBox="0 0 10 10"
                        refX="8.5"
                        refY="5"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto-start-reverse"
                    >
                        <path d="M0,1 L9,5 L0,9 Z" fill={m.color} />
                    </marker>
                ))}
            </defs>

            {/* Edge lines */}
            {positions.map((pos) => {
                const edge = buildEdge(centerBox, { x: pos.x, y: pos.y, w: GG.nodeW, h: GG.nodeH });
                const meta = RELATION_V3[pos.rel];
                if (!meta) return null;
                const isHover = hoverSlug === pos.slug;
                const isDim   = hoverSlug !== null && hoverSlug !== pos.slug;
                const opacity = isHover ? 1 : isDim ? 0.18 : 0.55;
                return (
                    <path
                        key={`e-${pos.slug}-${pos.rel}`}
                        d={edge.path}
                        fill="none"
                        stroke={meta.color}
                        strokeWidth={isHover ? 1.8 : 1.1}
                        strokeDasharray={meta.dashed ? "4 4" : undefined}
                        opacity={opacity}
                        markerEnd={meta.arrow === "out" ? `url(#arr-${pos.rel})` : undefined}
                        markerStart={meta.arrow === "in"  ? `url(#arr-${pos.rel})` : undefined}
                    />
                );
            })}

            {/* Edge label pills — drawn after lines so they sit on top */}
            {positions.map((pos) => {
                const edge = buildEdge(centerBox, { x: pos.x, y: pos.y, w: GG.nodeW, h: GG.nodeH });
                const meta = RELATION_V3[pos.rel];
                if (!meta) return null;
                const isHover = hoverSlug === pos.slug;
                const isDim   = hoverSlug !== null && hoverSlug !== pos.slug;
                const opacity = isHover ? 1 : isDim ? 0 : 0.95;
                const w = meta.short.length * 5.6 + 8;
                return (
                    <g
                        key={`lbl-${pos.slug}-${pos.rel}`}
                        transform={`translate(${edge.labelX} ${edge.labelY})`}
                        opacity={opacity}
                    >
                        <rect
                            x={-w / 2} y={-7} width={w} height={14} rx={3}
                            fill={GRAPH_PILL_BG}
                            stroke={meta.color}
                            strokeOpacity="0.7"
                            strokeWidth="0.8"
                        />
                        <text
                            x={0} y={3}
                            textAnchor="middle"
                            style={{
                                font: "500 9.5px ui-monospace, Geist Mono, monospace",
                                letterSpacing: "0.04em",
                                fill: meta.color,
                            }}
                        >
                            {meta.short}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── LaneLabel ──────────────────────────────────────────────────────────────────

interface LaneLabelProps {
    side: "W" | "E" | "N" | "S";
    top:  number;
    left: number;
}

function LaneLabel({ side, top, left }: LaneLabelProps) {
    const text = {
        W: "builds on · extended from · fed by",
        E: "extended by · feeds into · used by",
        N: "compared with",
        S: "learned alternative of",
    }[side];

    return (
        <div
            style={{
                position:      "absolute",
                top,
                left,
                font:          "500 9.5px ui-monospace, Geist Mono, monospace",
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color:         "hsl(var(--muted-foreground))",
                whiteSpace:    "nowrap",
                pointerEvents: "none",
                transform:     side === "W" ? "rotate(-90deg)" : side === "E" ? "rotate(90deg)" : undefined,
            }}
        >
            {text}
        </div>
    );
}

// ── TrailStripV3 ───────────────────────────────────────────────────────────────

interface TrailStripProps {
    history:   string[];
    current:   string;
    future:    string[];
    onBack:    () => void;
    onForward: () => void;
    onJump:    (i: number) => void;
}

function TrailStripV3({ history, current, future, onBack, onForward, onJump }: TrailStripProps) {
    const max = GG.trailMaxVisible;

    const histHidden  = Math.max(0, history.length - max);
    const histVisible = history.slice(-max);
    const histStart   = history.length - histVisible.length;
    const futHidden   = Math.max(0, future.length - max);
    const futVisible  = future.slice(0, max);

    const nodeTitle = (slug: string): string => {
        const node = contentGraph.nodes[slug];
        return node ? shortTitle(node.title) : slug;
    };

    return (
        <div className="flex items-center gap-2 h-10 px-4 border-y border-border bg-surface shrink-0">
            {/* Back button */}
            <button
                onClick={onBack}
                disabled={history.length === 0}
                className={`w-7 h-7 grid place-items-center rounded ${
                    history.length > 0
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/60 cursor-default"
                }`}
                title="Back (⌘[)"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Forward button */}
            <button
                onClick={onForward}
                disabled={future.length === 0}
                className={`w-7 h-7 grid place-items-center rounded ${
                    future.length > 0
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/60 cursor-default"
                }`}
                title="Forward (⌘])"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            <span className="w-px h-4 bg-border mx-1.5" />

            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mr-2">Trail</div>

            {/* Trail entries */}
            <div className="flex items-center gap-1.5 text-[12px] overflow-x-auto min-w-0">
                {histHidden > 0 && (
                    <>
                        <span className="text-[10.5px] font-mono text-muted-foreground/60 whitespace-nowrap" title={`${histHidden} earlier`}>
                            +{histHidden} earlier
                        </span>
                        <span className="text-muted-foreground/60">·</span>
                    </>
                )}
                {histVisible.map((s, i) => (
                    <span key={`h-${s}-${histStart + i}`} className="contents">
                        <button
                            onClick={() => onJump(histStart + i)}
                            className="text-foreground hover:underline truncate text-[11.5px]"
                        >
                            {nodeTitle(s)}
                        </button>
                        <span className="text-muted-foreground/60">›</span>
                    </span>
                ))}
                <span className="text-foreground font-semibold whitespace-nowrap text-[11.5px]">
                    {nodeTitle(current)}
                </span>
                {futVisible.map((s, i) => (
                    <span key={`f-${s}-${i}`} className="contents">
                        <span className="text-muted-foreground/60">›</span>
                        <span className="text-muted-foreground/60 whitespace-nowrap text-[11.5px]">{nodeTitle(s)}</span>
                    </span>
                ))}
                {futHidden > 0 && (
                    <>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-[10.5px] font-mono text-muted-foreground/60 whitespace-nowrap">+{futHidden} later</span>
                    </>
                )}
            </div>

            {/* Keyboard shortcut hint */}
            <div className="ml-auto flex items-center gap-1.5 text-[10.5px] text-muted-foreground shrink-0">
                <kbd className="font-mono px-1 py-0.5 rounded bg-surface border border-border-strong">⌘[</kbd>
                <span className="-ml-0.5">back</span>
                <kbd className="font-mono px-1 py-0.5 rounded bg-surface border border-border-strong ml-1.5">⌘]</kbd>
                <span className="-ml-0.5">forward</span>
            </div>
        </div>
    );
}

// ── RelationLegendV3 ───────────────────────────────────────────────────────────

interface RelationLegendV3Props {
    activeRels: Set<string>;
}

function RelationLegendV3({ activeRels }: RelationLegendV3Props) {
    const active = LANES_V3.filter((rel) => activeRels.has(rel));
    if (active.length === 0) return null;
    return (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-3 py-1.5 rounded-2xl max-w-[680px] bg-surface/90 backdrop-blur border border-border shadow-sm">
            {active.map((rel) => {
                const m = RELATION_V3[rel];
                return (
                    <span key={rel} className="inline-flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        <span className="text-foreground">{m.label}</span>
                    </span>
                );
            })}
        </div>
    );
}

// ── ZoomControls — see src/components/atlas/graph/ZoomControls.tsx ─────────────

// ── NodeFinder search adapter — see src/components/atlas/graph/NodeFinder.tsx ──

const NODE_FINDER_MAX = 8;

function nodeFinderSearch(query: string): NodeFinderItem[] {
    const matched = searchSlugs(query);
    if (!matched) return [];
    const out: NodeFinderItem[] = [];
    for (const slug of matched) {
        if (out.length >= NODE_FINDER_MAX) break;
        const node = contentGraph.nodes[slug];
        if (!node || node.draft) continue;
        // failure-mode nodes don't have a matching EntryIcon kind — fall back to algorithm
        const iconKind = (node.type === "algorithm" || node.type === "model" || node.type === "concept")
            ? node.type
            : "algorithm" as const;
        const kindLabel =
            node.type === "algorithm" ? "algo" :
            node.type === "model"     ? "model" :
            node.type === "concept"   ? "concept" : "other";
        out.push({
            id:       slug,
            title:    node.title,
            subtitle: kindLabel,
            icon:     <EntryIcon slug={slug} kind={iconKind} size={22} />,
        });
    }
    return out;
}

// ── Default focus resolution ───────────────────────────────────────────────────

function resolveInitialSlug(focusSlug: string | undefined): string | null {
    if (focusSlug && focusSlug in contentGraph.nodes && getNeighbors(focusSlug) !== null) {
        return focusSlug;
    }
    // Fall back to first algorithmPage with non-null getNeighbors
    for (const page of algorithmPages) {
        if (!page.frontmatter.draft && getNeighbors(page.slug) !== null) {
            return page.slug;
        }
    }
    return null;
}

// ── GraphExplorer (main export) ────────────────────────────────────────────────

export interface GraphExplorerProps {
    focusSlug?: string;
}

export default function GraphExplorer({ focusSlug }: GraphExplorerProps) {
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const initialSlug = useMemo(() => resolveInitialSlug(focusSlug), [focusSlug]);

    const [history, setHistory] = useState<string[]>([]);
    const [current, setCurrent] = useState<string>(initialSlug ?? "");
    const [future,  setFuture]  = useState<string[]>([]);
    const [hover,   setHover]   = useState<string | null>(null);

    // ── Trail navigation ───────────────────────────────────────────────────────

    const back = useCallback(() => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setFuture((f) => [current, ...f]);
        setHistory((h) => h.slice(0, -1));
        setCurrent(prev);
        setHover(null);
    }, [history, current]);

    const forward = useCallback(() => {
        if (future.length === 0) return;
        const next = future[0];
        setHistory((h) => [...h, current]);
        setFuture((f) => f.slice(1));
        setCurrent(next);
        setHover(null);
    }, [future, current]);

    const navigate = useCallback((slug: string) => {
        if (!(slug in contentGraph.nodes) || slug === current) return;
        // Smart back: clicking the immediate-previous node pops history
        if (history.length > 0 && history[history.length - 1] === slug) {
            back();
            return;
        }
        // Smart forward: clicking the next redo entry runs forward
        if (future.length > 0 && future[0] === slug) {
            forward();
            return;
        }
        setHistory((h) => [...h, current]);
        setCurrent(slug);
        setFuture([]);
        setHover(null);
    }, [current, history, future, back, forward]);

    const jumpToHistory = useCallback((i: number) => {
        const before  = history.slice(0, i);
        const target  = history[i];
        const popped  = history.slice(i + 1);
        setHistory(before);
        setFuture([...popped, current, ...future]);
        setCurrent(target);
        setHover(null);
    }, [history, current, future]);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────

    // Keep stable refs so the keydown handler can access latest state
    const backRef    = useRef(back);
    const forwardRef = useRef(forward);
    useEffect(() => { backRef.current    = back;    }, [back]);
    useEffect(() => { forwardRef.current = forward; }, [forward]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey;
            if (!meta) return;
            if (e.key === "[") { e.preventDefault(); backRef.current();    }
            if (e.key === "]") { e.preventDefault(); forwardRef.current(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ── Graph data ─────────────────────────────────────────────────────────────

    const cat    = useMemo(() => (current ? categorize_v3(current) : null), [current]);
    const layout = useMemo(() => (cat ? computeLayout(cat.byRel) : null),   [cat]);

    // ── Active rels (for legend filtering) ────────────────────────────────────

    const activeRels = useMemo<Set<string>>(() => {
        if (!cat) return new Set();
        const s = new Set<string>();
        for (const rel of LANES_V3) {
            if (cat.byRel[rel].length > 0) s.add(rel);
        }
        return s;
    }, [cat]);

    // ── Whiteboard pan/zoom state ──────────────────────────────────────────────

    // Bounding box (content coordinates) of the current layout, for useViewport's fitView.
    const bounds = useMemo<ViewportBounds | null>(() => {
        if (!layout) return null;
        let minX = layout.cx - GG.centerW / 2;
        let minY = layout.cy - GG.centerH / 2;
        let maxX = layout.cx + GG.centerW / 2;
        let maxY = layout.cy + GG.centerH / 2;

        for (const pos of layout.positions) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + GG.nodeW);
            maxY = Math.max(maxY, pos.y + GG.nodeH);
        }
        return { minX, minY, maxX, maxY };
    }, [layout]);

    const onPanStart = useCallback(() => setHover(null), []);

    const {
        viewportRef,
        planeRef,
        view,
        animate,
        fitView,
        zoomAroundCenter,
        onPointerDown:   handleViewportPointerDown,
        onPointerMove:   handleViewportPointerMove,
        onPointerUp:     handleViewportPointerUp,
        onPointerCancel: handleViewportPointerCancel,
    } = useViewport({ bounds, refitKey: current, onPanStart });

    // ── Empty state ────────────────────────────────────────────────────────────

    if (!initialSlug || !current) {
        return (
            <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
                No graph data available.
            </div>
        );
    }

    // ── Mobile branch — focused-entry hero + grouped neighbor lists ────────────

    if (!isDesktop) {
        return (
            <MobileGraphView
                history={history}
                current={current}
                onBack={back}
                onNavigate={navigate}
            />
        );
    }

    // ── Desktop — visual graph canvas ──────────────────────────────────────────

    if (!layout) {
        return (
            <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">
                No graph data available.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[460px]">
            {/* Trail strip — full width */}
            <TrailStripV3
                history={history}
                current={current}
                future={future}
                onBack={back}
                onForward={forward}
                onJump={jumpToHistory}
            />

            {/* Two-column row: viewport + right rail */}
            <div className="flex-1 flex min-h-0">
                {/* Whiteboard viewport */}
                <div
                    ref={viewportRef}
                    className="relative flex-1 min-w-0 overflow-hidden"
                    style={{
                        background:  GRAPH_CANVAS_GRADIENT,
                        touchAction: "none",
                    }}
                    onPointerDown={handleViewportPointerDown}
                    onPointerMove={handleViewportPointerMove}
                    onPointerUp={handleViewportPointerUp}
                    onPointerCancel={handleViewportPointerCancel}
                >
                    {/* Plane — the transformed coordinate space */}
                    <div
                        ref={planeRef}
                        className="absolute top-0 left-0"
                        style={{
                            width:           layout.canvasW,
                            height:          layout.canvasH,
                            transform:       `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                            transformOrigin: "0 0",
                            transition:      animate ? "transform 280ms ease" : "none",
                        }}
                    >
                        {/* Lane labels */}
                        <LaneLabel side="W" top={layout.cy + 70}              left={-30} />
                        <LaneLabel side="E" top={layout.cy - 70}              left={layout.canvasW - 30} />
                        <LaneLabel side="N" top={GG.pad + GG.nodeH + 12}     left={layout.cx - 50} />
                        <LaneLabel side="S" top={layout.canvasH - GG.pad - GG.nodeH - 22} left={layout.cx - 70} />

                        <EdgesLayerV3 positions={layout.positions} layout={layout} hoverSlug={hover} />
                        <CenterCardV3 slug={current} layout={layout} />

                        {layout.positions.map((pos) => (
                            <NeighborCardV3
                                key={`n-${pos.slug}-${pos.rel}`}
                                pos={pos}
                                isHovered={hover === pos.slug}
                                isDimmed={hover !== null && hover !== pos.slug}
                                onClick={navigate}
                                onHover={setHover}
                            />
                        ))}
                    </div>

                    {/* Viewport overlays — not scaled/translated */}
                    <NodeFinder search={nodeFinderSearch} onSelect={navigate} />
                    <RelationLegendV3 activeRels={activeRels} />
                    <ZoomControls
                        onZoomIn={() => zoomAroundCenter(1.25)}
                        onZoomOut={() => zoomAroundCenter(1 / 1.25)}
                        onFit={() => fitView(true)}
                    />
                </div>

                {/* Right rail — focused entry details; previews hovered neighbour */}
                <aside className="w-[300px] shrink-0 border-l border-border overflow-y-auto p-5 bg-surface">
                    <FocusedEntryPanel
                        slug={hover ?? current}
                        isPreview={hover != null && hover !== current}
                    />
                </aside>
            </div>
        </div>
    );
}
