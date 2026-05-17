/* eslint-disable */
// Per-entry unique icon placeholders.
//
// The user wants a unique icon for every atlas page. Until those are drawn,
// we render a deterministic placeholder glyph from a small set of "technical"
// SVG primitives, picked by a stable hash of the slug. That gives each card
// a distinct mark instead of the +/A/M/C letter — visually closer to the
// final design without committing to specific imagery.
//
// When real per-entry icons exist (e.g. coverImage), EntryIcon will fall
// through to that.

function _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

// 12 primitive glyph renderers. Each draws into a 24×24 viewBox.
// Stroke colour is supplied at call time so kind (algorithm/model/concept)
// can tint without rewriting paths.
const _GLYPHS = [
    // 0 — concentric rings
    (s) => <>
        <circle cx="12" cy="12" r="9.5" stroke={s} strokeWidth="1.2" fill="none" />
        <circle cx="12" cy="12" r="5"   stroke={s} strokeWidth="1.2" fill="none" />
        <circle cx="12" cy="12" r="1.2" fill={s} />
    </>,
    // 1 — 3×3 dot grid
    (s) => <g fill={s}>
        {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x},${y}`} cx={x} cy={y} r="1.2" />))}
    </g>,
    // 2 — crosshair
    (s) => <>
        <circle cx="12" cy="12" r="8" stroke={s} strokeWidth="1.2" fill="none" />
        <line x1="12" y1="2"  x2="12" y2="6"  stroke={s} strokeWidth="1.2" />
        <line x1="12" y1="18" x2="12" y2="22" stroke={s} strokeWidth="1.2" />
        <line x1="2"  y1="12" x2="6"  y2="12" stroke={s} strokeWidth="1.2" />
        <line x1="18" y1="12" x2="22" y2="12" stroke={s} strokeWidth="1.2" />
    </>,
    // 3 — pyramid of triangles
    (s) => <g stroke={s} strokeWidth="1.2" fill="none" strokeLinejoin="round">
        <path d="M12 4 L20 19 L4 19 Z" />
        <path d="M12 9 L17 18 L7 18 Z" />
    </g>,
    // 4 — 2×2 checker
    (s) => <g fill={s}>
        <rect x="4"  y="4"  width="7" height="7" />
        <rect x="13" y="13" width="7" height="7" />
        <rect x="4"  y="13" width="7" height="7" fill="none" stroke={s} strokeWidth="1.2" />
        <rect x="13" y="4"  width="7" height="7" fill="none" stroke={s} strokeWidth="1.2" />
    </g>,
    // 5 — corner L brackets
    (s) => <g stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round">
        <path d="M3 8 V3 H8" />
        <path d="M16 3 H21 V8" />
        <path d="M21 16 V21 H16" />
        <path d="M8 21 H3 V16" />
        <circle cx="12" cy="12" r="1.2" fill={s} stroke="none" />
    </g>,
    // 6 — diamond + dot
    (s) => <g stroke={s} strokeWidth="1.2" fill="none">
        <path d="M12 3 L21 12 L12 21 L3 12 Z" />
        <circle cx="12" cy="12" r="1.4" fill={s} stroke="none" />
    </g>,
    // 7 — waveform / two sines
    (s) => <g stroke={s} strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M2 9 Q7 4 12 9 T22 9" />
        <path d="M2 15 Q7 20 12 15 T22 15" />
    </g>,
    // 8 — radial spokes
    (s) => <g stroke={s} strokeWidth="1.2" strokeLinecap="round">
        {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 12 + 4  * Math.cos(a), y1 = 12 + 4  * Math.sin(a);
            const x2 = 12 + 10 * Math.cos(a), y2 = 12 + 10 * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <circle cx="12" cy="12" r="1.4" fill={s} stroke="none" />
    </g>,
    // 9 — three horizontal bars (descending)
    (s) => <g stroke={s} strokeWidth="2.2" strokeLinecap="round">
        <line x1="4" y1="7"  x2="20" y2="7"  />
        <line x1="4" y1="12" x2="16" y2="12" />
        <line x1="4" y1="17" x2="12" y2="17" />
    </g>,
    // 10 — arrow vector
    (s) => <g stroke={s} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="20" x2="19" y2="6" />
        <path d="M11 5 L19 5 L19 13" />
    </g>,
    // 11 — nested square with tick
    (s) => <g stroke={s} strokeWidth="1.2" fill="none">
        <rect x="3" y="3" width="18" height="18" />
        <rect x="8" y="8" width="8"  height="8" />
        <line x1="8" y1="3" x2="8"  y2="8" />
        <line x1="3" y1="8" x2="8"  y2="8" />
    </g>,
];

const KIND_TINT = {
    algorithm: "hsl(215 30% 28%)",
    model:     "hsl(191 60% 30%)",
    concept:   "hsl(215 16% 50%)",
};
const KIND_BG = {
    algorithm: "hsl(214 32% 96%)",
    model:     "hsl(191 60% 96%)",
    concept:   "hsl(210 40% 98%)",
};
const KIND_BORDER = {
    algorithm: "hsl(214 32% 88%)",
    model:     "hsl(191 50% 82%)",
    concept:   "hsl(214 32% 88%)",
};

function EntryIcon({ slug, kind = "algorithm", size = 30 }) {
    const i = _hash(slug) % _GLYPHS.length;
    const stroke = KIND_TINT[kind] || KIND_TINT.algorithm;
    return (
        <div
            className="shrink-0 grid place-items-center rounded-[4px] border"
            style={{
                width: size, height: size,
                backgroundColor: KIND_BG[kind],
                borderColor: KIND_BORDER[kind],
            }}
        >
            <svg
                width={Math.round(size * 0.72)}
                height={Math.round(size * 0.72)}
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                {_GLYPHS[i](stroke)}
            </svg>
        </div>
    );
}

Object.assign(window, { EntryIcon, KIND_TINT, KIND_BG, KIND_BORDER });
