// GraphExplorer — graph view for the Atlas
//
// Above the lg breakpoint: visual graph canvas (desktop).
// Below lg: focused-entry hero card + grouped neighbor lists (mobile).
// Both shapes share the same trail state machine and navigation contract.
// Props: { focusSlug?: string }

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import useMediaQuery from "../../hooks/useMediaQuery.ts";
import { contentGraph } from "../../generated/content-graph.ts";
import { algorithmPages, modelPages, conceptPages } from "../../generated/content-index.ts";
import { getNeighbors, shortTitle } from "../../lib/atlas/graphNeighbors.ts";
import { usePaperById } from "../../lib/atlas/usePaperById.ts";
import { taskLabel } from "../../lib/content/taskLabels.ts";
import { EntryIcon } from "./EntryIcon.tsx";

// ── Constants (ported verbatim from direction-2-graph.jsx) ─────────────────────

const GG = {
    canvasMinW: 1020,
    canvasMinH: 580,
    centerW:    360,
    centerH:    208,
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
    prerequisites: { label: "builds on",      short: "prereq",   color: "hsl(215 25% 45%)",  arrow: "in"  },
    extended_from: { label: "extended from",  short: "ext from", color: "hsl(215 19% 32%)",  arrow: "in"  },
    compared_with: { label: "compared with",  short: "vs",       color: "hsl(215 16% 55%)",  arrow: "none", dashed: true },
    extended_by:   { label: "extended by",    short: "ext by",   color: "hsl(215 19% 32%)",  arrow: "out" },
    feeds_into:    { label: "feeds into",     short: "feeds",    color: "hsl(215 25% 45%)",  arrow: "out" },
    learned_by:    { label: "learned alt of", short: "learn",    color: "hsl(191 55% 32%)",  arrow: "out" },
};

const LANES_V3 = [
    "prerequisites",
    "extended_from",
    "compared_with",
    "extended_by",
    "feeds_into",
    "learned_by",
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
    prerequisites: string[];
    extended_from: string[];
    compared_with: string[];
    extended_by:   string[];
    feeds_into:    string[];
    learned_by:    string[];
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
    ];
    const eList: Array<{ slug: string; rel: RelKey }> = [
        ...byRel.extended_by.map((s) => ({ slug: s, rel: "extended_by" as RelKey })),
        ...byRel.feeds_into.map((s) => ({ slug: s, rel: "feeds_into" as RelKey })),
    ];
    const nList: Array<{ slug: string; rel: RelKey }> = byRel.compared_with.map((s) => ({ slug: s, rel: "compared_with" }));
    const sList: Array<{ slug: string; rel: RelKey }> = byRel.learned_by.map((s) => ({ slug: s, rel: "learned_by" }));

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

// ── Edge geometry (ported verbatim from direction-2-graph.jsx) ─────────────────

interface ExitPoint { x: number; y: number; side: "left" | "right" | "top" | "bottom" }

function _edgeExit(boxX: number, boxY: number, w: number, h: number, toX: number, toY: number): ExitPoint {
    const bcx = boxX + w / 2, bcy = boxY + h / 2;
    const dx = toX - bcx, dy = toY - bcy;
    const adx = Math.abs(dx) / (w / 2 + 0.0001);
    const ady = Math.abs(dy) / (h / 2 + 0.0001);
    let side: ExitPoint["side"], px: number, py: number;
    if (adx > ady) {
        side = dx > 0 ? "right" : "left";
        px = boxX + (dx > 0 ? w : 0);
        py = bcy + (dy / Math.abs(dx)) * (w / 2);
    } else {
        side = dy > 0 ? "bottom" : "top";
        py = boxY + (dy > 0 ? h : 0);
        px = bcx + (dx / Math.abs(dy)) * (h / 2);
    }
    return { x: px, y: py, side };
}

function _ctrlFromSide(p: ExitPoint, side: ExitPoint["side"], dist: number): { x: number; y: number } {
    switch (side) {
        case "right":  return { x: p.x + dist, y: p.y };
        case "left":   return { x: p.x - dist, y: p.y };
        case "top":    return { x: p.x,        y: p.y - dist };
        case "bottom": return { x: p.x,        y: p.y + dist };
    }
}

interface EdgeGeometry {
    path:   string;
    labelX: number;
    labelY: number;
    start:  ExitPoint;
    end:    ExitPoint;
}

function buildEdge(centerBox: { x: number; y: number }, nodeBox: { x: number; y: number }): EdgeGeometry {
    const ncx = nodeBox.x + GG.nodeW / 2;
    const ncy = nodeBox.y + GG.nodeH / 2;
    const ccx = centerBox.x + GG.centerW / 2;
    const ccy = centerBox.y + GG.centerH / 2;

    const start = _edgeExit(centerBox.x, centerBox.y, GG.centerW, GG.centerH, ncx, ncy);
    const end   = _edgeExit(nodeBox.x,   nodeBox.y,   GG.nodeW,   GG.nodeH,   ccx, ccy);

    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const off  = Math.min(80, dist * 0.45);

    const c1 = _ctrlFromSide(start, start.side, off);
    const c2 = _ctrlFromSide(end,   end.side,   off);

    return {
        path:   `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
        labelX: start.x * 0.38 + end.x * 0.62,
        labelY: start.y * 0.38 + end.y * 0.62,
        start,
        end,
    };
}

// ── KIND_LABEL helper ──────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
    algorithm: "Algorithm",
    model:     "Model",
    concept:   "Concept",
};

// ── Mobile relation metadata ───────────────────────────────────────────────────

const REL_M: Record<RelKey, { label: string; color: string }> = {
    prerequisites: { label: "Builds on",            color: "hsl(215 25% 45%)" },
    extended_from: { label: "Extended from",        color: "hsl(215 19% 32%)" },
    compared_with: { label: "Compared with",        color: "hsl(215 16% 55%)" },
    extended_by:   { label: "Extended by",          color: "hsl(215 19% 32%)" },
    feeds_into:    { label: "Feeds into",           color: "hsl(215 25% 45%)" },
    learned_by:    { label: "Learned alternatives", color: "hsl(191 55% 32%)" },
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

    return (
        <button
            type="button"
            onClick={() => onClick(slug)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white border border-[hsl(214_32%_91%)] rounded-lg text-left active:bg-[hsl(214_32%_96%)]"
            style={{ touchAction: "none" }}
        >
            <EntryIcon slug={slug} kind={kind} size={32} />
            <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-[hsl(215_25%_22%)] leading-tight truncate -tracking-[0.1px]">
                    {shortTitle(node.title)}
                </div>
                <div className="text-[10.5px] text-[hsl(215_16%_55%)] uppercase tracking-[0.06em] truncate mt-0.5">
                    {KIND_LABEL[kind]}
                    {year != null && (
                        <> · <span className="font-mono normal-case tracking-normal">{year}</span></>
                    )}
                </div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[hsl(215_16%_55%)] shrink-0">
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
                <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-[hsl(215_16%_55%)] overflow-x-auto shrink-0 bg-[hsl(210_40%_97%)] border border-[hsl(214_32%_94%)] rounded-lg mb-3">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={history.length === 0}
                        className={`w-7 h-7 grid place-items-center rounded shrink-0 ${
                            history.length > 0
                                ? "text-[hsl(215_25%_22%)] active:bg-[hsl(214_32%_94%)]"
                                : "text-[hsl(215_16%_70%)]"
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="font-mono uppercase tracking-wider text-[9px] text-[hsl(215_16%_60%)] mr-1 shrink-0">Trail</span>
                    {hidden > 0 && (
                        <>
                            <span className="text-[10px] font-mono text-[hsl(215_16%_60%)] whitespace-nowrap">+{hidden} earlier</span>
                            <span className="text-[hsl(215_16%_72%)]">·</span>
                        </>
                    )}
                    {visible.map((s, i) => (
                        <span key={`m-${s}-${i}`} className="contents">
                            <span className="text-[hsl(215_25%_30%)] whitespace-nowrap">{nodeTitle(s)}</span>
                            <span className="text-[hsl(215_16%_72%)]">›</span>
                        </span>
                    ))}
                    <span className="text-[hsl(215_30%_15%)] font-semibold whitespace-nowrap">{nodeTitle(current)}</span>
                </div>
            )}

            {/* Focused entry hero card */}
            <div className="rounded-xl border-2 border-[hsl(215_19%_35%)] bg-white p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
                <div className="flex items-start gap-3">
                    <EntryIcon slug={current} kind={kind} size={44} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] text-[hsl(215_16%_55%)]">
                            <span className="text-[hsl(191_55%_28%)] font-semibold">Focused</span>
                            <span className="text-[hsl(215_16%_72%)]">·</span>
                            <span>{KIND_LABEL[kind]}</span>
                            {year != null && (
                                <><span className="text-[hsl(215_16%_72%)]">·</span><span className="font-mono normal-case tracking-normal">{year}</span></>
                            )}
                        </div>
                        <div className="text-[16px] font-semibold leading-tight text-[hsl(215_30%_15%)] -tracking-[0.2px] mt-0.5">
                            {node.title}
                        </div>
                    </div>
                </div>
                <p className="text-[12.5px] text-[hsl(215_25%_30%)] leading-[1.5] mt-3">
                    {bodyText}
                </p>
                {citationText && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-[hsl(215_16%_55%)]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
                            <path d="M4 12h12" />
                        </svg>
                        <span className="font-mono truncate">{citationText}</span>
                    </div>
                )}
                {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {tasks.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center h-[20px] px-2 rounded-[3px] border border-[hsl(191_50%_75%)] bg-[hsl(191_70%_97%)] text-[10.5px] text-[hsl(191_55%_28%)]">
                                {taskLabel(t)}
                            </span>
                        ))}
                    </div>
                )}
                <Link
                    to={node.path}
                    className="mt-4 flex items-center justify-center h-10 rounded-md bg-[hsl(215_30%_22%)] text-white text-[13px] font-medium hover:bg-[hsl(215_30%_16%)] active:bg-[hsl(215_30%_16%)]"
                >
                    Open page →
                </Link>
            </div>

            {/* Neighbor sections */}
            <div className="mt-5 flex items-baseline justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(215_16%_45%)]">
                    Related · {totalNeighbors}
                </h2>
                <span className="text-[10.5px] text-[hsl(215_16%_55%)]">tap to navigate</span>
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
                            <span className="text-[10.5px] text-[hsl(215_16%_60%)] tabular-nums ml-auto">{list.length}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {list.map((s) => (
                                <MobileNeighborRow key={`${rel}-${s}`} slug={s} onClick={onNavigate} />
                            ))}
                        </div>
                    </section>
                );
            })}

            <p className="mt-6 mb-2 px-1 text-[10.5px] text-[hsl(215_16%_55%)] leading-snug">
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
            className={`absolute group rounded-md border bg-white px-2.5 py-1.5 flex flex-col text-left transition-all ${
                isHovered
                    ? "border-[hsl(215_19%_40%)] shadow-[0_6px_18px_-8px_rgba(15,23,42,0.22)]"
                    : "border-[hsl(214_32%_88%)]"
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
            <div className="flex items-center gap-1.5">
                <EntryIcon slug={pos.slug} kind={kind} size={18} />
                <span className="text-[11.5px] font-semibold text-[hsl(215_25%_22%)] truncate -tracking-[0.1px] flex-1 min-w-0">
                    {shortTitle(node.title)}
                </span>
                <span className="font-mono text-[9.5px] text-[hsl(215_16%_55%)] tabular-nums shrink-0">
                    {year ?? ""}
                </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <span className="text-[9.5px] text-[hsl(215_16%_55%)] uppercase tracking-[0.06em] truncate">
                    {KIND_LABEL[kind]}
                </span>
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

// ── CenterCardV3 ───────────────────────────────────────────────────────────────

interface CenterCardProps {
    slug:   string;
    layout: Layout;
}

function CenterCardV3({ slug, layout }: CenterCardProps) {
    const node = contentGraph.nodes[slug];

    const kind: "algorithm" | "model" | "concept" =
        algorithmPages.some((p) => p.slug === slug) ? "algorithm" :
        modelPages.some((p) => p.slug === slug)     ? "model"     :
        "concept";

    const fm = (() => {
        const a = algorithmPages.find((p) => p.slug === slug);
        if (a) return a.frontmatter;
        const m = modelPages.find((p) => p.slug === slug);
        if (m) return m.frontmatter;
        const c = conceptPages.find((p) => p.slug === slug);
        if (c) return c.frontmatter;
        return undefined;
    })();

    // Primary source — resolved by hook at top of component, not inside loop.
    const primarySourceId = fm?.sources?.primary;
    const paper = usePaperById(primarySourceId);

    if (!node || !fm) return null;

    const tagline = (fm as { tagline?: string }).tagline;
    const bodyText = tagline ?? node.summary.slice(0, 160);
    const tasks = (fm as { tasks?: string[] }).tasks ?? [];

    // Compact citation: "First-surname · Venue Year"
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

    return (
        <div
            className="absolute rounded-xl border-2 border-[hsl(215_19%_35%)] bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.22),0_0_0_8px_rgba(255,255,255,0.6)] px-5 py-4 flex flex-col"
            style={{
                left:   layout.cx - GG.centerW / 2,
                top:    layout.cy - GG.centerH / 2,
                width:  GG.centerW,
                height: GG.centerH,
            }}
        >
            <div className="flex items-start gap-3">
                <EntryIcon slug={slug} kind={kind} size={40} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] text-[hsl(215_16%_55%)] mb-1">
                        <span className="text-[hsl(191_55%_28%)] font-semibold">Focused</span>
                        <span className="text-[hsl(215_16%_72%)]">·</span>
                        <span>{KIND_LABEL[kind]}</span>
                    </div>
                    <div className="text-[15px] font-semibold leading-tight text-[hsl(215_30%_15%)] -tracking-[0.2px]">
                        {node.title}
                    </div>
                </div>
            </div>

            <p className="text-[12.5px] text-[hsl(215_25%_30%)] leading-[1.5] mt-2.5 line-clamp-2 flex-1">
                {bodyText}
            </p>

            {citationText && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] text-[hsl(215_16%_55%)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
                        <path d="M4 12h12" />
                    </svg>
                    <span className="font-mono truncate">{citationText}</span>
                </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(214_32%_94%)]">
                <div className="flex flex-wrap gap-1 min-w-0">
                    {tasks.slice(0, 2).map((t) => (
                        <span
                            key={t}
                            className="inline-flex items-center h-[18px] px-1.5 rounded-[3px] border border-[hsl(191_50%_75%)] bg-[hsl(191_70%_97%)] text-[10px] text-[hsl(191_55%_28%)] whitespace-nowrap"
                        >
                            {taskLabel(t)}
                        </span>
                    ))}
                </div>
                <Link
                    to={node.path}
                    className="text-[11px] font-medium text-[hsl(215_19%_35%)] hover:text-[hsl(215_30%_15%)] hover:underline whitespace-nowrap shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    Open page →
                </Link>
            </div>
        </div>
    );
}

// ── EdgesLayerV3 ───────────────────────────────────────────────────────────────

interface EdgesLayerProps {
    positions:  PositionedNode[];
    layout:     Layout;
    hoverSlug:  string | null;
}

function EdgesLayerV3({ positions, layout, hoverSlug }: EdgesLayerProps) {
    const centerBox = { x: layout.cx - GG.centerW / 2, y: layout.cy - GG.centerH / 2 };

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
                const edge = buildEdge(centerBox, pos);
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
                const edge = buildEdge(centerBox, pos);
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
                            fill="white"
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
        W: "builds on   ·   extended from",
        E: "extended by   ·   feeds into",
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
                color:         "hsl(215 16% 60%)",
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
        <div className="flex items-center gap-2 h-10 px-4 border-y border-[hsl(214_32%_91%)] bg-white shrink-0">
            {/* Back button */}
            <button
                onClick={onBack}
                disabled={history.length === 0}
                className={`w-7 h-7 grid place-items-center rounded ${
                    history.length > 0
                        ? "text-[hsl(215_25%_22%)] hover:bg-[hsl(214_32%_92%)]"
                        : "text-[hsl(215_16%_70%)] cursor-default"
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
                        ? "text-[hsl(215_25%_22%)] hover:bg-[hsl(214_32%_92%)]"
                        : "text-[hsl(215_16%_70%)] cursor-default"
                }`}
                title="Forward (⌘])"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            <span className="w-px h-4 bg-[hsl(214_32%_88%)] mx-1.5" />

            <div className="text-[10px] uppercase tracking-[0.14em] text-[hsl(215_16%_55%)] mr-2">Trail</div>

            {/* Trail entries */}
            <div className="flex items-center gap-1.5 text-[12px] overflow-x-auto min-w-0">
                {histHidden > 0 && (
                    <>
                        <span className="text-[10.5px] font-mono text-[hsl(215_16%_60%)] whitespace-nowrap" title={`${histHidden} earlier`}>
                            +{histHidden} earlier
                        </span>
                        <span className="text-[hsl(215_16%_72%)]">·</span>
                    </>
                )}
                {histVisible.map((s, i) => (
                    <span key={`h-${s}-${histStart + i}`} className="contents">
                        <button
                            onClick={() => onJump(histStart + i)}
                            className="text-[hsl(215_25%_30%)] hover:underline truncate text-[11.5px]"
                        >
                            {nodeTitle(s)}
                        </button>
                        <span className="text-[hsl(215_16%_72%)]">›</span>
                    </span>
                ))}
                <span className="text-[hsl(215_30%_15%)] font-semibold whitespace-nowrap text-[11.5px]">
                    {nodeTitle(current)}
                </span>
                {futVisible.map((s, i) => (
                    <span key={`f-${s}-${i}`} className="contents">
                        <span className="text-[hsl(215_16%_72%)]">›</span>
                        <span className="text-[hsl(215_16%_60%)] whitespace-nowrap text-[11.5px]">{nodeTitle(s)}</span>
                    </span>
                ))}
                {futHidden > 0 && (
                    <>
                        <span className="text-[hsl(215_16%_72%)]">·</span>
                        <span className="text-[10.5px] font-mono text-[hsl(215_16%_60%)] whitespace-nowrap">+{futHidden} later</span>
                    </>
                )}
            </div>

            {/* Keyboard shortcut hint */}
            <div className="ml-auto flex items-center gap-1.5 text-[10.5px] text-[hsl(215_16%_55%)] shrink-0">
                <kbd className="font-mono px-1 py-0.5 rounded bg-white border border-[hsl(214_32%_85%)]">⌘[</kbd>
                <span className="-ml-0.5">back</span>
                <kbd className="font-mono px-1 py-0.5 rounded bg-white border border-[hsl(214_32%_85%)] ml-1.5">⌘]</kbd>
                <span className="-ml-0.5">forward</span>
            </div>
        </div>
    );
}

// ── RelationLegendV3 ───────────────────────────────────────────────────────────

function RelationLegendV3() {
    return (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-[hsl(214_32%_88%)] shadow-sm">
            {LANES_V3.map((rel) => {
                const m = RELATION_V3[rel];
                return (
                    <span key={rel} className="inline-flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        <span className="text-[hsl(215_25%_30%)]">{m.label}</span>
                    </span>
                );
            })}
        </div>
    );
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

    // ── Touch: tap outside a card clears the pinned hover ─────────────────────

    const canvasRef = useRef<HTMLDivElement>(null);

    const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.pointerType === "touch" || e.pointerType === "pen") && e.target === canvasRef.current) {
            setHover(null);
        }
    }, []);

    // ── Graph data ─────────────────────────────────────────────────────────────

    const cat    = useMemo(() => (current ? categorize_v3(current) : null), [current]);
    const layout = useMemo(() => (cat ? computeLayout(cat.byRel) : null),   [cat]);

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
        <div className="flex flex-col min-h-0">
            {/* Trail strip */}
            <TrailStripV3
                history={history}
                current={current}
                future={future}
                onBack={back}
                onForward={forward}
                onJump={jumpToHistory}
            />

            {/* Canvas region */}
            <div className="flex-1 px-7 py-5 overflow-auto min-h-0 flex items-start justify-center">
                <div
                    ref={canvasRef}
                    className="relative rounded-lg border border-[hsl(214_32%_91%)] overflow-hidden"
                    style={{
                        width:      layout.canvasW,
                        height:     layout.canvasH,
                        background: "radial-gradient(ellipse at center, hsl(0 0% 100%) 0%, hsl(210 40% 98%) 70%, hsl(214 32% 95%) 100%)",
                        touchAction: "none",
                    }}
                    onPointerDown={handleCanvasPointerDown}
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

                    <RelationLegendV3 />
                </div>
            </div>
        </div>
    );
}
