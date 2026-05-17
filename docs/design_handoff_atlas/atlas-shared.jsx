/* eslint-disable */
// Shared atlas chrome — the bits every direction reuses verbatim so
// the comparison stays apples-to-apples and only the content area differs.

const { useState, useMemo, useEffect, useRef } = React;

// ── Type letter glyph ────────────────────────────────────────────────────────
// Replaces the current "+" icon. Always 30×30, monospaced letter, kind-coloured.
function TypeGlyph({ kind, size = 30 }) {
    const palette = {
        algorithm: { fg: "hsl(215 30% 22%)",  bg: "hsl(214 32% 96%)", br: "hsl(214 32% 88%)" },
        model:     { fg: "hsl(191 60% 28%)",  bg: "hsl(191 60% 96%)", br: "hsl(191 50% 80%)" },
        concept:   { fg: "hsl(215 20% 38%)",  bg: "hsl(210 40% 98%)", br: "hsl(214 32% 88%)" },
    };
    const p = palette[kind] || palette.algorithm;
    return (
        <div
            className="shrink-0 grid place-items-center rounded-[4px] border font-mono font-semibold"
            style={{
                width: size, height: size,
                backgroundColor: p.bg,
                borderColor: p.br,
                color: p.fg,
                fontSize: Math.round(size * 0.42),
                letterSpacing: 0,
            }}
            title={KIND_LABEL[kind]}
        >
            {KIND_LETTER[kind]}
        </div>
    );
}

// Tiny inline pill — used for relation chips and inline metadata.
function MetaPill({ children, tone = "neutral" }) {
    const tones = {
        neutral: "border-[hsl(214_32%_88%)] text-[hsl(215_16%_42%)] bg-transparent",
        warm:    "border-[hsl(191_50%_75%)] text-[hsl(191_55%_28%)] bg-[hsl(191_70%_97%)]",
        dim:     "border-transparent text-[hsl(215_16%_55%)] bg-[hsl(210_40%_96%)]",
    };
    return (
        <span className={`inline-flex items-center h-[18px] px-1.5 rounded-[3px] border text-[10.5px] font-medium leading-none ${tones[tone]}`}>
            {children}
        </span>
    );
}

function DifficultyDot({ d }) {
    const label = { beg: "Beginner", int: "Intermediate", adv: "Advanced" }[d] || "—";
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[hsl(215_16%_47%)]">
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: "hsl(191 75% 55%)" }} />
            {label}
        </span>
    );
}

// ── Vitavision logo (the V mark from the screenshots) ────────────────────────
function VLogo() {
    return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="vitavision">
            <path d="M2 3 L11 19 L20 3" stroke="hsl(215 30% 22%)" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="11" cy="9" r="1.6" fill="hsl(191 75% 55%)" />
        </svg>
    );
}

// ── App header bar ──────────────────────────────────────────────────────────
function AppHeader({ active = "Atlas" }) {
    const links = ["Blog", "Atlas", "Demos", "Editor", "Targets", "About"];
    return (
        <header className="flex items-center justify-between h-14 px-6 border-b border-[hsl(214_32%_91%)] bg-[hsl(0_0%_100%)]">
            <VLogo />
            <nav className="flex items-center gap-5 text-[13px] text-[hsl(215_16%_47%)]">
                {links.map((l) => (
                    <span key={l} className={l === active ? "font-medium text-[hsl(215_25%_27%)]" : ""}>
                        {l}
                    </span>
                ))}
                <span className="w-px h-4 bg-[hsl(214_32%_88%)] mx-1" />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
                <div className="w-7 h-7 rounded-full bg-[hsl(214_32%_88%)] border border-[hsl(214_32%_82%)]" />
            </nav>
        </header>
    );
}

// ── Sidebar (left column, identical across directions) ──────────────────────
function AtlasSidebar({ counts, activeKind = "all", activeProblem = null, showTags = true }) {
    const items = [
        { id: "all",       label: "All",        n: counts.all },
        { id: "algorithm", label: "Algorithms", n: counts.algorithm },
        { id: "model",     label: "Models",     n: counts.model },
        { id: "concept",   label: "Concepts",   n: counts.concept },
    ];
    // Count entries per problem from PROBLEMS_OF mapping.
    const problemCounts = useMemo(() => {
        const c = {};
        for (const e of ATLAS_ENTRIES) {
            for (const p of PROBLEMS_OF(e.slug)) c[p] = (c[p] || 0) + 1;
        }
        return c;
    }, []);
    const tags = ["calibration", "computer-vision", "chessboard", "feature-detection", "geometry", "cnn"];
    return (
        <aside className="w-[224px] shrink-0 border-r border-[hsl(214_32%_91%)] px-5 py-6 overflow-y-auto">
            {/* Type ------------------------------------------------------- */}
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(215_16%_55%)] mb-3">Type</div>
            <ul className="flex flex-col gap-px mb-6">
                {items.map((it) => {
                    const active = it.id === activeKind;
                    return (
                        <li key={it.id} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] ${active ? "bg-[hsl(214_32%_94%)] text-[hsl(215_25%_22%)] font-medium" : "text-[hsl(215_16%_47%)]"}`}>
                            <span>{it.label}</span>
                            <span className="text-[11.5px] tabular-nums">{it.n}</span>
                        </li>
                    );
                })}
            </ul>

            {/* Problem ---------------------------------------------------- */}
            <div className="flex items-baseline justify-between mb-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(215_16%_55%)]">Problem</div>
                {activeProblem && <span className="text-[10px] text-[hsl(215_16%_60%)]">clear</span>}
            </div>
            <ul className="flex flex-col gap-px mb-6">
                {ATLAS_PROBLEMS.map((p) => {
                    const active = p.id === activeProblem;
                    const n = problemCounts[p.id] || 0;
                    if (!n) return null;
                    return (
                        <li key={p.id} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12.5px] ${active ? "bg-[hsl(191_70%_94%)] text-[hsl(191_55%_22%)] font-medium" : "text-[hsl(215_16%_47%)]"}`}>
                            <span className="truncate">{p.label}</span>
                            <span className="text-[11px] tabular-nums text-[hsl(215_16%_60%)] ml-2 shrink-0">{n}</span>
                        </li>
                    );
                })}
            </ul>

            {showTags && (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(215_16%_55%)]">Tags</div>
                        <span className="text-[11px] text-[hsl(191_55%_35%)]">all 129 →</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                            <span key={t} className="inline-block px-2 py-0.5 rounded-md text-[11px] text-[hsl(215_16%_47%)] border border-[hsl(214_32%_91%)]">
                                {t}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </aside>
    );
}

// ── Page title + search + view toggle row ───────────────────────────────────
function AtlasTopRow({ total, searchValue = "", onSearch, viewIcons }) {
    return (
        <div className="flex items-baseline justify-between mb-4">
            <div>
                <h1 className="text-[24px] font-semibold tracking-tight text-[hsl(215_30%_18%)] -tracking-[0.5px]">
                    Atlas <span className="text-[hsl(215_16%_55%)] font-normal text-[15px] ml-0.5 tabular-nums">{total}</span>
                </h1>
                <p className="text-[13px] text-[hsl(215_16%_47%)] mt-1">Practical computer vision atlas — algorithms, models, and concepts.</p>
            </div>
            <div className="flex items-center gap-2.5">
                <div className="relative w-[260px]">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(215_16%_55%)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        value={searchValue}
                        onChange={(e) => onSearch?.(e.target.value)}
                        placeholder="Search algorithms, relations, years…"
                        className="w-full h-8 pl-7 pr-12 rounded-md border border-[hsl(214_32%_88%)] bg-[hsl(210_40%_98%)] text-[12px] placeholder:text-[hsl(215_16%_55%)] outline-none focus:bg-white focus:border-[hsl(215_19%_55%)]"
                    />
                    <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[hsl(215_16%_55%)] border border-[hsl(214_32%_85%)] rounded px-1 py-px bg-white">⌘K</kbd>
                </div>
                {viewIcons}
            </div>
        </div>
    );
}

function ViewToggle({ value }) {
    const items = [
        { id: "grid", icon: <rect x="3" y="3" width="7" height="7" /> },
        { id: "list", icon: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></> },
        { id: "group", icon: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></> },
    ];
    return (
        <div className="flex items-center gap-0.5 h-8 border border-[hsl(214_32%_88%)] rounded-md bg-white px-0.5">
            {items.map((it) => {
                const active = it.id === value;
                return (
                    <span key={it.id} className={`h-7 w-7 grid place-items-center rounded ${active ? "bg-[hsl(214_32%_94%)] text-[hsl(215_25%_22%)]" : "text-[hsl(215_16%_55%)]"}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {it.icon}
                        </svg>
                    </span>
                );
            })}
        </div>
    );
}

function SectionHeader({ label, count, kicker }) {
    return (
        <div className="flex items-baseline gap-2.5 mt-6 mb-3">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[hsl(215_16%_45%)]">{label}</h2>
            {typeof count === "number" && (
                <span className="text-[10.5px] text-[hsl(215_16%_60%)] tabular-nums">{count}</span>
            )}
            {kicker && <span className="text-[11px] text-[hsl(215_16%_55%)] ml-auto">{kicker}</span>}
        </div>
    );
}

// ── Artboard frame ──────────────────────────────────────────────────────────
// Each direction renders inside this — gives the browser-chrome screenshot a
// consistent envelope so they read as the same product surface.
function Artboard({ title, subtitle, children, width = 1320 }) {
    return (
        <div className="flex flex-col" style={{ width }}>
            <div className="mb-3 px-1">
                <div className="text-[16px] font-semibold text-[hsl(215_30%_18%)] tracking-tight">{title}</div>
                {subtitle && <div className="text-[12px] text-[hsl(215_16%_47%)] mt-0.5 leading-snug">{subtitle}</div>}
            </div>
            <div className="rounded-[10px] border border-[hsl(214_32%_85%)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] overflow-hidden">
                {children}
            </div>
        </div>
    );
}

Object.assign(window, {
    TypeGlyph, MetaPill, DifficultyDot, VLogo,
    AppHeader, AtlasSidebar, AtlasTopRow, ViewToggle, SectionHeader, Artboard,
});
