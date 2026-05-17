/* eslint-disable */
// Direction 1 — Refined Catalog
//
// Closest to current. Same grid + sidebar + grouping. Cards densified:
//   • "+" glyph replaced by a UNIQUE per-entry icon (placeholder until you
//     draw the real ones — the slot is reserved and the system is in place)
//   • a single meta line: problem · year (domain becomes the group header,
//     so it's redundant on the card itself)
//   • a single relation line: "→ extended by SURF, ORB"
//   • difficulty removed — too noisy for the value it added
//
// The relation line is what makes a card feel like a graph node instead of
// a catalog entry. Every other dimension stays where the current design
// left it.

function RelationLine({ entry }) {
    const { to = [], vs = [] } = entry;
    if (!to.length && !vs.length) return null;

    const pick = to.length ? { label: "extended by", slugs: to.slice(0, 3) }
                           : { label: "compared with", slugs: vs.slice(0, 2) };
    const all = (pick.label === "extended by" ? to : vs);

    return (
        <div className="flex items-center gap-1.5 text-[11px] text-[hsl(215_16%_47%)] min-w-0">
            <span className="font-mono text-[hsl(215_16%_60%)] shrink-0">→</span>
            <span className="shrink-0">{pick.label}</span>
            <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                {pick.slugs.map((s, i) => (
                    <React.Fragment key={s}>
                        <span className="text-[hsl(215_25%_30%)] font-medium truncate hover:underline">{SHORT_OF(s)}</span>
                        {i < pick.slugs.length - 1 && <span className="text-[hsl(215_16%_70%)]">·</span>}
                    </React.Fragment>
                ))}
                {all.length > pick.slugs.length && (
                    <span className="text-[hsl(215_16%_60%)]">+{all.length - pick.slugs.length}</span>
                )}
            </span>
        </div>
    );
}

// Tiny corner button for "open this entry in the graph explorer".
// Always visible (per user request) but tonally restrained until hovered.
function GraphChip() {
    return (
        <button
            type="button"
            title="Open in graph explorer"
            className="shrink-0 w-6 h-6 grid place-items-center rounded-md border border-[hsl(214_32%_91%)] bg-white text-[hsl(215_16%_55%)] hover:text-[hsl(191_55%_28%)] hover:border-[hsl(191_50%_65%)] hover:bg-[hsl(191_70%_97%)] transition-colors"
        >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        </button>
    );
}

function RefinedCard({ entry }) {
    const problems = PROBLEMS_OF(entry.slug);
    const primaryProblem = problems[0];
    const probLabel = ATLAS_PROBLEMS.find((p) => p.id === primaryProblem)?.label;
    return (
        <div className="flex flex-col gap-2 rounded-lg border border-[hsl(214_32%_91%)] bg-white p-3 hover:border-[hsl(215_19%_55%)] transition-colors min-h-[112px] group">
            <div className="flex items-start gap-2.5">
                <EntryIcon slug={entry.slug} kind={entry.t} size={30} />
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold leading-snug text-[hsl(215_25%_22%)] -tracking-[0.1px]">
                        {entry.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-[hsl(215_16%_55%)] uppercase tracking-[0.06em]">
                        {probLabel && <span className="truncate">{probLabel}</span>}
                        {probLabel && entry.y && <span className="text-[hsl(215_16%_72%)]">·</span>}
                        {entry.y && <span className="font-mono tabular-nums normal-case tracking-normal">{entry.y}</span>}
                    </div>
                </div>
                <GraphChip />
            </div>
            <p className="text-[11.5px] text-[hsl(215_16%_47%)] leading-[1.45] line-clamp-2">
                {entry.sum}
            </p>
            <div className="mt-auto pt-0.5">
                <RelationLine entry={entry} />
            </div>
        </div>
    );
}

function RefinedCatalog() {
    const counts = useMemo(() => {
        const c = { all: ATLAS_ENTRIES.length, algorithm: 0, model: 0, concept: 0 };
        for (const e of ATLAS_ENTRIES) c[e.t]++;
        return c;
    }, []);

    const algoByDomain = useMemo(() => {
        const m = new Map();
        for (const e of ATLAS_ENTRIES) {
            if (e.t !== "algorithm") continue;
            if (!m.has(e.d)) m.set(e.d, []);
            m.get(e.d).push(e);
        }
        return ATLAS_DOMAINS.map((d) => ({ d, list: m.get(d.id) || [] })).filter((g) => g.list.length);
    }, []);

    const algoCount = ATLAS_ENTRIES.filter((e) => e.t === "algorithm").length;
    const [first, second] = [algoByDomain[0], algoByDomain[1]];

    return (
        <div className="flex bg-[hsl(210_40%_98%)]" style={{ height: 820 }}>
            <AtlasSidebar counts={counts} activeKind="all" />
            <main className="flex-1 px-8 py-6 overflow-y-auto">
                <AtlasTopRow total={counts.all} searchValue="" viewIcons={<ViewToggle value="grid" />} />

                <SectionHeader label="Algorithms" count={algoCount} kicker={`Showing ${first?.list.length + second?.list.length || 0} of ${algoCount}`} />

                {/* Domain group 1 ------------------------------------------ */}
                <div className="mb-5">
                    <div className="flex items-baseline gap-2 mb-2.5">
                        <span className="text-[12px] font-semibold text-[hsl(215_25%_30%)]">{first.d.label}</span>
                        <span className="text-[11px] text-[hsl(215_16%_60%)] tabular-nums">{first.list.length}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {first.list.slice(0, 6).map((e) => <RefinedCard key={e.slug} entry={e} />)}
                    </div>
                </div>

                {/* Domain group 2 ------------------------------------------ */}
                <div>
                    <div className="flex items-baseline gap-2 mb-2.5">
                        <span className="text-[12px] font-semibold text-[hsl(215_25%_30%)]">{second.d.label}</span>
                        <span className="text-[11px] text-[hsl(215_16%_60%)] tabular-nums">{second.list.length}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {second.list.slice(0, 6).map((e) => <RefinedCard key={e.slug} entry={e} />)}
                    </div>
                </div>
            </main>
        </div>
    );
}

Object.assign(window, { RefinedCatalog, RefinedCard, RelationLine });
