/* eslint-disable */
// Mobile Graph view
//
// On a 390-px-wide screen, a visual graph isn't honest — you'd need pan,
// zoom, and pinch just to read three nodes. Better answer: drop the visual,
// keep the BEHAVIOR. The mobile view is a focused entry plus its typed
// neighbors as grouped lists. Tap a neighbor → it becomes focused. Back
// chevron pops the trail.
//
// This isn't a fallback — it's a deliberate other shape of the same idea.

const REL_M = {
    prerequisites:  { label: "Builds on",            color: "hsl(215 25% 45%)" },
    extended_from:  { label: "Extended from",        color: "hsl(215 19% 32%)" },
    compared_with:  { label: "Compared with",        color: "hsl(215 16% 55%)" },
    extended_by:    { label: "Extended by",          color: "hsl(215 19% 32%)" },
    feeds_into:     { label: "Feeds into",           color: "hsl(215 25% 45%)" },
    learned_by:     { label: "Learned alternatives", color: "hsl(191 55% 32%)" },
};
const LANES_M = ["prerequisites", "extended_from", "compared_with", "extended_by", "feeds_into", "learned_by"];

function categorize_m(slug) {
    const n = getNeighbors(slug);
    if (!n) return null;
    const seen = new Set([slug]);
    const out = {};
    for (const rel of LANES_M) {
        out[rel] = [];
        for (const s of n[rel] || []) {
            if (seen.has(s) || !ATLAS_BY_SLUG[s]) continue;
            seen.add(s);
            out[rel].push(s);
        }
    }
    return out;
}

function MobileNeighbor({ slug, rel, onClick }) {
    const e = ATLAS_BY_SLUG[slug];
    return (
        <button
            onClick={() => onClick(slug)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white border border-[hsl(214_32%_91%)] rounded-lg text-left active:bg-[hsl(214_32%_96%)]"
        >
            <EntryIcon slug={slug} kind={e.t} size={32} />
            <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-[hsl(215_25%_22%)] leading-tight truncate -tracking-[0.1px]">
                    {SHORT_OF(slug)}
                </div>
                <div className="text-[10.5px] text-[hsl(215_16%_55%)] uppercase tracking-[0.06em] truncate mt-0.5">
                    {KIND_LABEL[e.t]} · {ATLAS_DOMAINS.find((d) => d.id === e.d)?.label}
                    {e.y && <> · <span className="font-mono normal-case tracking-normal">{e.y}</span></>}
                </div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[hsl(215_16%_55%)] shrink-0">
                <polyline points="9 18 15 12 9 6" />
            </svg>
        </button>
    );
}

function MobileGraph({ startSlug = "sift" }) {
    const [history, setHistory] = React.useState(["harris"]);
    const [current, setCurrent] = React.useState(startSlug);
    const focus = ATLAS_BY_SLUG[current];
    const cat = React.useMemo(() => categorize_m(current), [current]);
    const totalNeighbors = LANES_M.reduce((n, r) => n + cat[r].length, 0);

    const navigate = (slug) => {
        if (!ATLAS_BY_SLUG[slug] || slug === current) return;
        // Smart back: tapping a row whose slug equals the last trail entry
        // pops instead of pushing — keeps the trail honest.
        if (history.length && history[history.length - 1] === slug) {
            back();
            return;
        }
        setHistory([...history, current]);
        setCurrent(slug);
    };
    const back = () => {
        if (!history.length) return;
        const prev = history[history.length - 1];
        setHistory(history.slice(0, -1));
        setCurrent(prev);
    };

    const probs = PROBLEMS_OF(current);

    return (
        <div className="relative bg-[hsl(210_40%_98%)] overflow-hidden flex flex-col" style={{ width: 390, height: 800 }}>
            {/* iOS-style status bar -------------------------------------- */}
            <div className="flex items-center justify-between h-11 px-6 text-[12.5px] text-[hsl(215_30%_15%)] font-semibold shrink-0">
                <span>9:41</span>
                <span className="flex items-center gap-1">
                    <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="3" width="2" height="4" rx="0.5"/><rect x="3" y="2" width="2" height="6" rx="0.5"/><rect x="6" y="1" width="2" height="8" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/></svg>
                    <span className="text-[11px]">5G</span>
                    <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor"/><rect x="2" y="2" width="14" height="7" rx="1" fill="currentColor"/><rect x="19" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor"/></svg>
                </span>
            </div>

            {/* App bar --------------------------------------------------- */}
            <div className="flex items-center gap-2 h-11 px-3 border-b border-[hsl(214_32%_91%)] bg-white shrink-0">
                <button onClick={back} disabled={!history.length}
                        className={`w-9 h-9 grid place-items-center rounded-md ${history.length ? "text-[hsl(215_25%_22%)] active:bg-[hsl(214_32%_94%)]" : "text-[hsl(215_16%_70%)]"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[hsl(215_16%_55%)]">Atlas · graph</div>
                    <div className="text-[14px] font-semibold text-[hsl(215_25%_22%)] truncate -tracking-[0.1px]">
                        {SHORT_OF(current)}
                    </div>
                </div>
                <button className="w-9 h-9 grid place-items-center rounded-md text-[hsl(215_25%_22%)] active:bg-[hsl(214_32%_94%)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </button>
            </div>

            {/* Trail breadcrumb ----------------------------------------- */}
            {history.length > 0 && (() => {
                const TRAIL_MAX = 3;
                const hidden = Math.max(0, history.length - TRAIL_MAX);
                const visible = history.slice(-TRAIL_MAX);
                return (
                    <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] text-[hsl(215_16%_55%)] overflow-x-auto shrink-0 bg-[hsl(210_40%_97%)] border-b border-[hsl(214_32%_94%)]">
                        <span className="font-mono uppercase tracking-wider text-[9px] text-[hsl(215_16%_60%)] mr-1">Trail</span>
                        {hidden > 0 && (
                            <>
                                <span className="text-[10px] font-mono text-[hsl(215_16%_60%)] whitespace-nowrap">+{hidden} earlier</span>
                                <span className="text-[hsl(215_16%_72%)]">·</span>
                            </>
                        )}
                        {visible.map((s, i) => (
                            <React.Fragment key={`m-${s}-${i}`}>
                                <span className="text-[hsl(215_25%_30%)] whitespace-nowrap">{SHORT_OF(s)}</span>
                                <span className="text-[hsl(215_16%_72%)]">›</span>
                            </React.Fragment>
                        ))}
                        <span className="text-[hsl(215_30%_15%)] font-semibold whitespace-nowrap">{SHORT_OF(current)}</span>
                    </div>
                );
            })()}

            {/* Scroll area ---------------------------------------------- */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Focused entry card ---------------------------------- */}
                <div className="rounded-xl border-2 border-[hsl(215_19%_35%)] bg-white p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
                    <div className="flex items-start gap-3">
                        <EntryIcon slug={current} kind={focus.t} size={44} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] text-[hsl(215_16%_55%)]">
                                <span className="text-[hsl(191_55%_28%)] font-semibold">Focused</span>
                                <span className="text-[hsl(215_16%_72%)]">·</span>
                                <span>{KIND_LABEL[focus.t]}</span>
                                {focus.y && <><span className="text-[hsl(215_16%_72%)]">·</span><span className="font-mono normal-case tracking-normal">{focus.y}</span></>}
                            </div>
                            <div className="text-[16px] font-semibold leading-tight text-[hsl(215_30%_15%)] -tracking-[0.2px] mt-0.5">
                                {focus.title}
                            </div>
                        </div>
                    </div>
                    <p className="text-[12.5px] text-[hsl(215_25%_30%)] leading-[1.5] mt-3">
                        {TAGLINE_OF(current) || focus.sum}
                    </p>
                    {SOURCE_OF(current) && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-[hsl(215_16%_55%)]">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
                                <path d="M4 12h12" />
                            </svg>
                            <span className="font-mono truncate">{SOURCE_OF(current)}</span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {probs.map((p) => (
                            <span key={p} className="inline-flex items-center h-[20px] px-2 rounded-[3px] border border-[hsl(191_50%_75%)] bg-[hsl(191_70%_97%)] text-[10.5px] text-[hsl(191_55%_28%)]">
                                {ATLAS_PROBLEMS.find((x) => x.id === p)?.label}
                            </span>
                        ))}
                    </div>
                    <button className="w-full mt-4 h-10 rounded-md bg-[hsl(215_30%_22%)] text-white text-[13px] font-medium active:bg-[hsl(215_30%_16%)]">
                        Open page →
                    </button>
                </div>

                {/* Neighbor sections ----------------------------------- */}
                <div className="mt-5 flex items-baseline justify-between">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(215_16%_45%)]">
                        Related · {totalNeighbors}
                    </h2>
                    <span className="text-[10.5px] text-[hsl(215_16%_55%)]">tap to navigate</span>
                </div>

                {LANES_M.map((rel) => {
                    const list = cat[rel];
                    if (!list.length) return null;
                    return (
                        <section key={rel} className="mt-3">
                            <div className="flex items-center gap-1.5 mb-1.5 px-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: REL_M[rel].color }} />
                                <span className="text-[11px] font-semibold" style={{ color: REL_M[rel].color }}>
                                    {REL_M[rel].label}
                                </span>
                                <span className="text-[10.5px] text-[hsl(215_16%_60%)] tabular-nums ml-auto">{list.length}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {list.map((s) => (
                                    <MobileNeighbor key={`${rel}-${s}`} slug={s} rel={rel} onClick={navigate} />
                                ))}
                            </div>
                        </section>
                    );
                })}

                {/* Footer note ------------------------------------------ */}
                <div className="mt-6 mb-2 px-1 text-[10.5px] text-[hsl(215_16%_55%)] leading-snug">
                    The visual graph from desktop is reshaped into a list here. Same data, same
                    navigation — tap any entry to recenter, back arrow above to backtrack.
                </div>
            </div>

            {/* Home indicator -------------------------------------------- */}
            <div className="h-6 flex items-end justify-center pb-2 shrink-0 bg-white border-t border-[hsl(214_32%_94%)]">
                <div className="w-32 h-1 rounded-full bg-[hsl(215_25%_27%)]/35" />
            </div>
        </div>
    );
}

Object.assign(window, { MobileGraph });
