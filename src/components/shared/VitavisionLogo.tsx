import { motion, type Variants } from "framer-motion";

interface VitavisionLogoProps {
    /** "full" renders all elements; "mark" renders only the VV letterform (bold strokes) */
    variant?: "full" | "mark";
    /** Enable framer-motion entrance animation (path draw + fade-in stagger) */
    animate?: boolean;
    className?: string;
}

const DOT_COLOR = "hsl(var(--brand))";

/* ─── SVG geometry extracted from vitavision-logo-opt.svg ─── */

const VV = [
    { d: "m507 422 105 207 100-191", sw: 24, lj: "bevel" as const },
    { d: "m1201 439 202-400 274 1-523 1013h-105L858 683l-190 370H561L40 40h273l194 382", sw: 24 },
    { d: "m1006 437 98 191 97-189", sw: 24, lj: "bevel" as const },
    { d: "M712 438 508 40h241l109 210L967 39h241l-202 398", sw: 22 },
];

const STRIPS = [
    { d: "m960 203 31-66M758 203l-27-58", sw: 10 },
    { d: "m918 276 15-35M799 277l-16-36", sw: 11 },
    { d: "m363 311-98-187M568 705 416 411", sw: 16 },
    { d: "m678 675 37-59M1038 677l-36-59M1089 770l-29-54M627 770l29-53", sw: 15 },
    { d: "m1350 316 103-195M1197 608l103-196m-30 84", sw: 16 },
];

const SMALL_DOTS: [number, number][] = [
    [163,123],[214,219],[265,313],[314,409],[364,505],
    [414,601],[464,696],[513,792],[564,887],[614,982],
    [264,122],[315,219],[365,314],[415,409],[465,504],
    [515,600],[615,792],[665,887],[715,791],
    [648,792],[564,696],[664,696],
    [625,123],[675,219],[726,314],[776,219],[726,123],
    [990,314],[1040,218],[940,218],[989,122],[1090,122],
    [765,695],[951,696],[1000,791],[1051,887],[1101,982],
    [1152,887],[1202,791],[1102,791],[1051,696],[1151,696],
    [1252,695],[1201,601],[1302,601],[1353,505],[1252,505],
    [1302,410],[1402,409],[1351,314],[1452,314],
    [1503,218],[1402,219],[1452,123],[1552,122],
];

const EYE_WEDGES = [
    "M1246 690a221 221 0 0 1 87 90l-195 103Z",
    "M941 783a218 218-31 0 1 86-91l109 189z",
];

const EYE_RINGS = [
    { cx: 1136.6, cy: 880.4, r: 208.9, accent: true },
    { cx: 1136.9, cy: 880.6, r: 185,   accent: false },
    { cx: 1137.4, cy: 880.8, r: 132.3, accent: true },
    { cx: 1136.7, cy: 880.4, r: 98.3,  accent: false },
    { cx: 1136.7, cy: 881.2, r: 57.9,  accent: true },
];

/* ─── Animation timing ─── */

const DRAW = 0.9;
const DOT_DELAY = 0.4;
const EYE_DELAY = 0.6;

const dotContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.025, delayChildren: DOT_DELAY } },
};

const dotItem: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35 } },
};

/* ─── Component ─── */

export default function VitavisionLogo({
    variant = "full",
    animate = false,
    className,
}: VitavisionLogoProps) {
    const full = variant === "full";
    const mark = variant === "mark";
    const bg = "hsl(var(--background))";

    // Mark variant: 2.5× thicker strokes for legibility at small sizes
    const swMul = mark ? 2.5 : 1;

    return (
        <svg
            viewBox="0 0 1717 1091"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* ── Decorative strips (full only) ── */}
            {full && (
                <g fill="none" stroke="currentColor" strokeLinejoin="bevel" opacity={0.4}>
                    {animate
                        ? STRIPS.map((s, i) => (
                            <motion.path
                                key={i}
                                d={s.d}
                                strokeWidth={s.sw}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: DOT_DELAY + i * 0.08 }}
                            />
                        ))
                        : STRIPS.map((s, i) => (
                            <path key={i} d={s.d} strokeWidth={s.sw} />
                        ))
                    }
                </g>
            )}

            {/* ── VV letterform (always) ── */}
            <g
                fill="none"
                stroke="currentColor"
                strokeLinecap={mark ? "round" : undefined}
            >
                {animate
                    ? VV.map((p, i) => (
                        <motion.path
                            key={i}
                            d={p.d}
                            strokeWidth={p.sw * swMul}
                            strokeLinejoin={p.lj}
                            initial={{ pathLength: 0, opacity: 0.2 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: DRAW, ease: "easeInOut", delay: i * 0.06 }}
                        />
                    ))
                    : VV.map((p, i) => (
                        <path key={i} d={p.d} strokeWidth={p.sw * swMul} strokeLinejoin={p.lj} />
                    ))
                }
            </g>

            

            {/* ── Small circles along arms (full only) ── */}
            {full && (
                animate ? (
                    <motion.g fill={DOT_COLOR} initial="hidden" animate="visible" variants={dotContainer}>
                        {SMALL_DOTS.map(([cx, cy], i) => (
                            <motion.circle key={i} cx={cx} cy={cy} r={33} variants={dotItem} />
                        ))}
                    </motion.g>
                ) : (
                    <g fill={DOT_COLOR}>
                        {SMALL_DOTS.map(([cx, cy], i) => (
                            <circle key={i} cx={cx} cy={cy} r={33} />
                        ))}
                    </g>
                )
            )}

            {/* ── Bullseye / target center (full only) ── */}
            {full && (
                <g transform="translate(-278 -408)">
                    {animate ? (
                        <>
                            <motion.g
                                fill={bg}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: EYE_DELAY }}
                            >
                                {EYE_WEDGES.map((d, i) => <path key={i} d={d} />)}
                            </motion.g>
                            {EYE_RINGS.map((c, i) => (
                                <motion.circle
                                    key={i}
                                    cx={c.cx}
                                    cy={c.cy}
                                    r={c.r}
                                    fill={c.accent ? DOT_COLOR : bg}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: EYE_DELAY + i * 0.1 }}
                                />
                            ))}
                        </>
                    ) : (
                        <>
                            <g fill={bg}>
                                {EYE_WEDGES.map((d, i) => <path key={i} d={d} />)}
                            </g>
                            {EYE_RINGS.map((c, i) => (
                                <circle
                                    key={i}
                                    cx={c.cx}
                                    cy={c.cy}
                                    r={c.r}
                                    fill={c.accent ? DOT_COLOR : bg}
                                />
                            ))}
                        </>
                    )}
                </g>
            )}
        </svg>
    );
}
