/* eslint-disable */
// Direction 2 — Graph Explorer (v3)
//
// Changes from v2 (per user feedback):
//   • All connections visible — no per-relation cap, canvas grows to fit
//   • Curved cubic-bezier edges that exit each card perpendicular to the
//     edge they cross — reads as wires, not a string-pull
//   • Relation-tinted edges with hover highlighting (others dim, hovered
//     edge gets weight + saturation)
//   • Center card is richer — title, kind/year/problem strip, summary,
//     Open-page action — so a separate side panel is no longer needed and
//     the canvas takes the full main-area width
//   • Vertical lane labels on left/right
//   • Cleaner backdrop — drop the dotgrid; subtle vignette only
//
// Lanes:
//   WEST   — prerequisites + extended_from   (stacked column)
//   NORTH  — compared_with                   (row, wraps every 5)
//   EAST   — extended_by + feeds_into        (stacked column)
//   SOUTH  — learned alternatives            (row)

const GG = {
    canvasMinW: 1020,
    canvasMinH: 580,
    centerW: 360, centerH: 208,
    nodeW: 184,  nodeH: 68,
    pad: 24, gap: 12,
    laneOff: 20,
    trailMaxVisible: 4,  // how many previous + future entries to show in the trail strip
};

const RELATION_V3 = {
    prerequisites:  { label: "builds on",      short: "prereq",   color: "hsl(215 25% 45%)",  arrow: "in"  },
    extended_from:  { label: "extended from",  short: "ext from", color: "hsl(215 19% 32%)",  arrow: "in"  },
    compared_with:  { label: "compared with",  short: "vs",       color: "hsl(215 16% 55%)",  arrow: "none", dashed: true },
    extended_by:    { label: "extended by",    short: "ext by",   color: "hsl(215 19% 32%)",  arrow: "out" },
    feeds_into:     { label: "feeds into",     short: "feeds",    color: "hsl(215 25% 45%)",  arrow: "out" },
    learned_by:     { label: "learned alt of", short: "learn",    color: "hsl(191 55% 32%)",  arrow: "out" },
};
const LANES_V3 = ["prerequisites", "extended_from", "compared_with", "extended_by", "feeds_into", "learned_by"];

function categorize_v3(slug) {
    const n = getNeighbors(slug);
    if (!n) return null;
    const seen = new Set([slug]);
    const out = {};
    for (const rel of LANES_V3) {
        out[rel] = [];
        for (const s of n[rel] || []) {
            if (seen.has(s) || !ATLAS_BY_SLUG[s]) continue;
            seen.add(s);
            out[rel].push(s);
        }
    }
    return { focus: n.focus, byRel: out };
}

// ── Layout ────────────────────────────────────────────────────────────────
function computeLayout(byRel) {
    const wList = [
        ...byRel.prerequisites.map((s) => ({ slug: s, rel: "prerequisites" })),
        ...byRel.extended_from.map((s) => ({ slug: s, rel: "extended_from" })),
    ];
    const eList = [
        ...byRel.extended_by.map((s) => ({ slug: s, rel: "extended_by" })),
        ...byRel.feeds_into.map((s) => ({ slug: s, rel: "feeds_into" })),
    ];
    const nList = byRel.compared_with.map((s) => ({ slug: s, rel: "compared_with" }));
    const sList = byRel.learned_by.map((s)   => ({ slug: s, rel: "learned_by"   }));

    const wrapAt = 5;
    const nRows = Math.max(1, Math.ceil(nList.length / wrapAt) || 1);
    const sRows = Math.max(1, Math.ceil(sList.length / wrapAt) || 1);
    const nRowsReal = nList.length ? Math.ceil(nList.length / wrapAt) : 0;
    const sRowsReal = sList.length ? Math.ceil(sList.length / wrapAt) : 0;

    // canvas height: need verticalLane >= max(W,E) cards + space for N/S rows
    const wHeight = wList.length * (GG.nodeH + GG.gap);
    const eHeight = eList.length * (GG.nodeH + GG.gap);
    const vNeeded = Math.max(wHeight, eHeight, GG.centerH + 80);
    const nBlock = nRowsReal * (GG.nodeH + GG.gap) + (nRowsReal ? 40 : 0);
    const sBlock = sRowsReal * (GG.nodeH + GG.gap) + (sRowsReal ? 40 : 0);
    const canvasH = Math.max(GG.canvasMinH, vNeeded + nBlock + sBlock + GG.pad * 2);

    // canvas width: lanes hug edges; N/S rows determine middle horizontal need
    const nW = Math.min(wrapAt, nList.length) * (GG.nodeW + GG.gap);
    const sW = Math.min(wrapAt, sList.length) * (GG.nodeW + GG.gap);
    const middleNeeded = Math.max(GG.centerW + 80, nW, sW);
    const canvasW = Math.max(
        GG.canvasMinW,
        middleNeeded + 2 * (GG.pad + GG.nodeW + 40),
    );

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    const positions = [];

    // West stack -----------------------------------------------------------
    {
        const totalH = wList.length * GG.nodeH + Math.max(0, wList.length - 1) * GG.gap;
        let y = cy - totalH / 2;
        for (const item of wList) {
            positions.push({ ...item, x: GG.pad, y });
            y += GG.nodeH + GG.gap;
        }
    }
    // East stack -----------------------------------------------------------
    {
        const totalH = eList.length * GG.nodeH + Math.max(0, eList.length - 1) * GG.gap;
        let y = cy - totalH / 2;
        for (const item of eList) {
            positions.push({ ...item, x: canvasW - GG.pad - GG.nodeW, y });
            y += GG.nodeH + GG.gap;
        }
    }
    // North rows (top of canvas, rows stack downward) -----------------------
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
    // South rows (bottom of canvas, rows stack upward) ---------------------
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

// ── Edge geometry ─────────────────────────────────────────────────────────
// Pick the exit point on a card edge along the line from card center to
// target, returning both the point and which side of the box it lies on.
function _edgeExit(boxX, boxY, w, h, toX, toY) {
    const bcx = boxX + w / 2, bcy = boxY + h / 2;
    const dx = toX - bcx, dy = toY - bcy;
    const adx = Math.abs(dx) / (w / 2 + 0.0001);
    const ady = Math.abs(dy) / (h / 2 + 0.0001);
    let side, px, py;
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

function _ctrlFromSide(p, side, dist) {
    switch (side) {
        case "right":  return { x: p.x + dist, y: p.y };
        case "left":   return { x: p.x - dist, y: p.y };
        case "top":    return { x: p.x,        y: p.y - dist };
        case "bottom": return { x: p.x,        y: p.y + dist };
    }
    return p;
}

function buildEdge(centerBox, nodeBox) {
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
        path: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
        // label midpoint biased toward neighbor (0.62 of the curve)
        labelX: start.x * 0.38 + end.x * 0.62,
        labelY: start.y * 0.38 + end.y * 0.62,
        start, end,
    };
}

// ── Components ────────────────────────────────────────────────────────────
function NeighborCardV3({ pos, isHovered, isDimmed, onClick, onHover }) {
    const e = ATLAS_BY_SLUG[pos.slug];
    const meta = RELATION_V3[pos.rel];
    return (
        <button
            onClick={() => onClick(pos.slug)}
            onMouseEnter={() => onHover(pos.slug)}
            onMouseLeave={() => onHover(null)}
            className={`absolute group rounded-md border bg-white px-2.5 py-1.5 flex flex-col text-left transition-all ${isHovered ? "border-[hsl(215_19%_40%)] shadow-[0_6px_18px_-8px_rgba(15,23,42,0.22)]" : "border-[hsl(214_32%_88%)]"}`}
            style={{
                left: pos.x, top: pos.y, width: GG.nodeW, height: GG.nodeH,
                opacity: isDimmed ? 0.4 : 1,
            }}
        >
            <div className="flex items-center gap-1.5">
                <EntryIcon slug={pos.slug} kind={e.t} size={18} />
                <span className="text-[11.5px] font-semibold text-[hsl(215_25%_22%)] truncate -tracking-[0.1px] flex-1 min-w-0">
                    {SHORT_OF(pos.slug)}
                </span>
                <span className="font-mono text-[9.5px] text-[hsl(215_16%_55%)] tabular-nums shrink-0">
                    {e.y ?? ""}
                </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <span className="text-[9.5px] text-[hsl(215_16%_55%)] uppercase tracking-[0.06em] truncate">
                    {KIND_LABEL[e.t]}
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

function CenterCardV3({ slug, layout }) {
    const e = ATLAS_BY_SLUG[slug];
    if (!e) return null;
    const probs = PROBLEMS_OF(slug);
    const tagline = TAGLINE_OF(slug);
    const source  = SOURCE_OF(slug);
    return (
        <div
            className="absolute rounded-xl border-2 border-[hsl(215_19%_35%)] bg-white shadow-[0_12px_32px_-12px_rgba(15,23,42,0.22),0_0_0_8px_rgba(255,255,255,0.6)] px-5 py-4 flex flex-col"
            style={{
                left: layout.cx - GG.centerW / 2,
                top:  layout.cy - GG.centerH / 2,
                width: GG.centerW, height: GG.centerH,
            }}
        >
            <div className="flex items-start gap-3">
                <EntryIcon slug={e.slug} kind={e.t} size={40} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] text-[hsl(215_16%_55%)] mb-1">
                        <span className="text-[hsl(191_55%_28%)] font-semibold">Focused</span>
                        <span className="text-[hsl(215_16%_72%)]">·</span>
                        <span>{KIND_LABEL[e.t]}</span>
                        <span className="text-[hsl(215_16%_72%)]">·</span>
                        <span>{ATLAS_DOMAINS.find((d) => d.id === e.d)?.label}</span>
                    </div>
                    <div className="text-[15px] font-semibold leading-tight text-[hsl(215_30%_15%)] -tracking-[0.2px]">
                        {e.title}
                    </div>
                </div>
            </div>

            {/* Short summary (tagline) — non-technical one-liner */}
            <p className="text-[12.5px] text-[hsl(215_25%_30%)] leading-[1.5] mt-2.5 line-clamp-2 flex-1">
                {tagline || e.sum}
            </p>

            {/* Primary source — small, mono, citation-style */}
            <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] text-[hsl(215_16%_55%)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
                    <path d="M4 12h12" />
                </svg>
                <span className="font-mono truncate">{source || "—"}</span>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(214_32%_94%)]">
                <div className="flex flex-wrap gap-1 min-w-0">
                    {probs.slice(0, 2).map((p) => (
                        <span key={p} className="inline-flex items-center h-[18px] px-1.5 rounded-[3px] border border-[hsl(191_50%_75%)] bg-[hsl(191_70%_97%)] text-[10px] text-[hsl(191_55%_28%)] whitespace-nowrap">
                            {ATLAS_PROBLEMS.find((x) => x.id === p)?.label}
                        </span>
                    ))}
                </div>
                <a className="text-[11px] font-medium text-[hsl(215_19%_35%)] hover:text-[hsl(215_30%_15%)] hover:underline whitespace-nowrap shrink-0">
                    Open page →
                </a>
            </div>
        </div>
    );
}

function EdgesLayerV3({ positions, layout, hoverSlug }) {
    const centerBox = { x: layout.cx - GG.centerW / 2, y: layout.cy - GG.centerH / 2 };
    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.canvasW} height={layout.canvasH}
            viewBox={`0 0 ${layout.canvasW} ${layout.canvasH}`}
        >
            <defs>
                {Object.entries(RELATION_V3).map(([k, m]) => (
                    <marker
                        key={`mk-${k}`}
                        id={`arr-${k}`}
                        viewBox="0 0 10 10" refX="8.5" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse"
                    >
                        <path d="M0,1 L9,5 L0,9 Z" fill={m.color} />
                    </marker>
                ))}
            </defs>

            {/* edges */}
            {positions.map((pos) => {
                const edge = buildEdge(centerBox, pos);
                const meta = RELATION_V3[pos.rel];
                const isHover = hoverSlug === pos.slug;
                const isDim   = hoverSlug && hoverSlug !== pos.slug;
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
                        markerStart={meta.arrow === "in" ? `url(#arr-${pos.rel})` : undefined}
                    />
                );
            })}

            {/* edge labels — drawn after lines so they sit on top */}
            {positions.map((pos) => {
                const edge = buildEdge(centerBox, pos);
                const meta = RELATION_V3[pos.rel];
                const isHover = hoverSlug === pos.slug;
                const isDim   = hoverSlug && hoverSlug !== pos.slug;
                const opacity = isHover ? 1 : isDim ? 0.0 : 0.95;
                const w = meta.short.length * 5.6 + 8;
                return (
                    <g key={`lbl-${pos.slug}-${pos.rel}`} transform={`translate(${edge.labelX} ${edge.labelY})`} opacity={opacity}>
                        <rect
                            x={-w / 2} y={-7} width={w} height={14} rx={3}
                            fill="white" stroke={meta.color} strokeOpacity="0.7" strokeWidth="0.8"
                        />
                        <text x={0} y={3} textAnchor="middle"
                              style={{ font: "500 9.5px ui-monospace,Geist Mono,monospace", letterSpacing: "0.04em", fill: meta.color }}>
                            {meta.short}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

function LaneLabel({ side, top, left }) {
    // Vertical for W/E, horizontal for N/S
    const text = {
        W: "builds on   ·   extended from",
        E: "extended by   ·   feeds into",
        N: "compared with",
        S: "learned alternative of",
    }[side];
    const style = {
        position: "absolute",
        top, left,
        font: "500 9.5px ui-monospace,Geist Mono,monospace",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "hsl(215 16% 60%)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
    };
    if (side === "W") style.transform = "rotate(-90deg)";
    if (side === "E") style.transform = "rotate(90deg)";
    return <div style={style}>{text}</div>;
}

function TrailStripV3({ history, current, future, onBack, onForward, onJump }) {
    const max = GG.trailMaxVisible;
    // Show only the last `max` entries of history; if more exist, prepend an
    // "+N earlier" indicator. Same on the future side. The full history is
    // preserved in state — this only affects display.
    const histHidden = Math.max(0, history.length - max);
    const histVisible = history.slice(-max);
    const histStart   = history.length - histVisible.length;
    const futHidden   = Math.max(0, future.length - max);
    const futVisible  = future.slice(0, max);

    return (
        <div className="flex items-center gap-2 h-10 px-4 border-y border-[hsl(214_32%_91%)] bg-white">
            <button onClick={onBack} disabled={!history.length}
                    className={`w-7 h-7 grid place-items-center rounded ${history.length ? "text-[hsl(215_25%_22%)] hover:bg-[hsl(214_32%_92%)]" : "text-[hsl(215_16%_70%)] cursor-default"}`}
                    title="Back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={onForward} disabled={!future.length}
                    className={`w-7 h-7 grid place-items-center rounded ${future.length ? "text-[hsl(215_25%_22%)] hover:bg-[hsl(214_32%_92%)]" : "text-[hsl(215_16%_70%)] cursor-default"}`}
                    title="Forward">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <span className="w-px h-4 bg-[hsl(214_32%_88%)] mx-1.5" />
            <div className="text-[10px] uppercase tracking-[0.14em] text-[hsl(215_16%_55%)] mr-2">Trail</div>
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
                    <React.Fragment key={`h-${s}-${histStart + i}`}>
                        <button onClick={() => onJump(histStart + i)} className="text-[hsl(215_25%_30%)] hover:underline truncate">
                            {SHORT_OF(s)}
                        </button>
                        <span className="text-[hsl(215_16%_72%)]">›</span>
                    </React.Fragment>
                ))}
                <span className="text-[hsl(215_30%_15%)] font-semibold whitespace-nowrap">{SHORT_OF(current)}</span>
                {futVisible.map((s, i) => (
                    <React.Fragment key={`f-${s}-${i}`}>
                        <span className="text-[hsl(215_16%_72%)]">›</span>
                        <span className="text-[hsl(215_16%_60%)] whitespace-nowrap">{SHORT_OF(s)}</span>
                    </React.Fragment>
                ))}
                {futHidden > 0 && (
                    <>
                        <span className="text-[hsl(215_16%_72%)]">·</span>
                        <span className="text-[10.5px] font-mono text-[hsl(215_16%_60%)] whitespace-nowrap">+{futHidden} later</span>
                    </>
                )}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10.5px] text-[hsl(215_16%_55%)] shrink-0">
                <kbd className="font-mono px-1 py-0.5 rounded bg-white border border-[hsl(214_32%_85%)]">⌘[</kbd>
                <span className="-ml-0.5">back</span>
                <kbd className="font-mono px-1 py-0.5 rounded bg-white border border-[hsl(214_32%_85%)] ml-1.5">⌘]</kbd>
                <span className="-ml-0.5">forward</span>
            </div>
        </div>
    );
}

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

// ── Main view ────────────────────────────────────────────────────────────
function GraphExplorer({ startSlug = "sift" }) {
    const counts = React.useMemo(() => {
        const c = { all: ATLAS_ENTRIES.length, algorithm: 0, model: 0, concept: 0 };
        for (const e of ATLAS_ENTRIES) c[e.t]++;
        return c;
    }, []);

    const [history, setHistory] = React.useState(["harris"]);
    const [current, setCurrent] = React.useState(startSlug);
    const [future,  setFuture]  = React.useState([]);
    const [hover,   setHover]   = React.useState(null);

    const cat = React.useMemo(() => categorize_v3(current), [current]);
    const layout = React.useMemo(() => cat ? computeLayout(cat.byRel) : null, [cat]);

    const navigate = (slug) => {
        if (!ATLAS_BY_SLUG[slug] || slug === current) return;
        // Smart back: clicking the immediately-previous node pops history
        // instead of pushing a new entry. Avoids the a→b→a→b zigzag.
        if (history.length && history[history.length - 1] === slug) {
            back();
            return;
        }
        // Smart forward: same for the next entry on the redo stack.
        if (future.length && future[0] === slug) {
            forward();
            return;
        }
        setHistory([...history, current]);
        setCurrent(slug);
        setFuture([]);
        setHover(null);
    };
    const back = () => {
        if (!history.length) return;
        const prev = history[history.length - 1];
        setFuture([current, ...future]);
        setHistory(history.slice(0, -1));
        setCurrent(prev);
    };
    const forward = () => {
        if (!future.length) return;
        const next = future[0];
        setHistory([...history, current]);
        setFuture(future.slice(1));
        setCurrent(next);
    };
    const jumpToHistory = (i) => {
        const before = history.slice(0, i);
        const target = history[i];
        const popped = history.slice(i + 1);
        setHistory(before);
        setFuture([...popped, current, ...future]);
        setCurrent(target);
    };

    if (!layout) return null;

    return (
        <div className="flex bg-[hsl(210_40%_98%)]" style={{ height: 820 }}>
            <AtlasSidebar counts={counts} activeKind="all" showTags={false} />

            <main className="flex-1 flex flex-col min-w-0">
                {/* Header row ----------------------------------------------- */}
                <div className="px-7 pt-5 pb-3 flex items-baseline justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold tracking-tight text-[hsl(215_30%_18%)] -tracking-[0.4px]">
                            Atlas <span className="text-[hsl(215_16%_55%)] font-normal text-[14px] ml-0.5 tabular-nums">{counts.all}</span>
                            <span className="ml-3 text-[12px] font-normal text-[hsl(215_16%_47%)]">Graph explorer</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className="relative w-[240px]">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(215_16%_55%)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <input placeholder="Jump to node…" className="w-full h-8 pl-7 pr-12 rounded-md border border-[hsl(214_32%_88%)] bg-white text-[12px] placeholder:text-[hsl(215_16%_55%)] outline-none focus:border-[hsl(215_19%_55%)]" />
                            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[hsl(215_16%_55%)] border border-[hsl(214_32%_85%)] rounded px-1 py-px bg-white">⌘K</kbd>
                        </div>
                        <div className="flex items-center gap-0.5 h-8 border border-[hsl(214_32%_88%)] rounded-md bg-white px-0.5 text-[hsl(215_16%_55%)]">
                            <span className="h-7 w-7 grid place-items-center rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/></svg></span>
                            <span className="h-7 w-7 grid place-items-center rounded bg-[hsl(214_32%_94%)] text-[hsl(215_25%_22%)]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="1.6"/><circle cx="20" cy="6" r="1.6"/><circle cx="4" cy="18" r="1.6"/><circle cx="20" cy="18" r="1.6"/><line x1="6" y1="6" x2="10" y2="10"/><line x1="18" y1="6" x2="14" y2="10"/><line x1="6" y1="18" x2="10" y2="14"/><line x1="18" y1="18" x2="14" y2="14"/></svg>
                            </span>
                        </div>
                    </div>
                </div>

                <TrailStripV3 history={history} current={current} future={future} onBack={back} onForward={forward} onJump={jumpToHistory} />

                {/* Canvas region ------------------------------------------- */}
                <div className="flex-1 px-7 py-5 overflow-auto min-h-0 flex items-start justify-center">
                    <div
                        className="relative rounded-lg border border-[hsl(214_32%_91%)] overflow-hidden"
                        style={{
                            width: layout.canvasW,
                            height: layout.canvasH,
                            background: "radial-gradient(ellipse at center, hsl(0 0% 100%) 0%, hsl(210 40% 98%) 70%, hsl(214 32% 95%) 100%)",
                        }}
                    >
                        {/* Lane labels */}
                        <LaneLabel side="W" top={layout.cy + 70} left={-30} />
                        <LaneLabel side="E" top={layout.cy - 70} left={layout.canvasW - 30} />
                        <LaneLabel side="N" top={GG.pad + GG.nodeH + 12} left={layout.cx - 50} />
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
            </main>
        </div>
    );
}

Object.assign(window, { GraphExplorer });
