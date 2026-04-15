import { motion } from "framer-motion";

interface VitavisionLogoProps {
    /** "full" renders all elements; "mark" renders only the mark */
    variant?: "full" | "mark";
    /** Enable framer-motion entrance animation (path draw + scale-in stagger) */
    animate?: boolean;
    className?: string;
}

/* ─── SVG geometry extracted from vitavision-logo_v2_opt.svg ─── */

const V_OUTER = "m102.8 113.4 15.6-27.6h34.7l-40 71s-.6 1.3-3.3 4.7c-1.6 2-4.3 3-7 3q-4.2 0-7-2.9c-1.6-1.7-4-6.2-4-6.2L52.4 85.8H87z";
const V_INNER = "m102.6 112.3 28.2-15.1-28 49.5-28-49.5Z";

/* ─── Component ─── */

export default function VitavisionLogo({
    variant = "full",
    animate = false,
    className,
}: VitavisionLogoProps) {
    // "mark" thickens strokes for legibility at small sizes (e.g. navbar h-9).
    const strokeWidth = variant === "mark" ? 5.4 : 4.2;

    const strokeProps = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round" as const,
    };

    return (
        <svg
            viewBox="0 0 107.9 82.9"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="geometricPrecision"
            aria-hidden="true"
            className={className}
        >
            <g transform="translate(-48.8 -83.7)">
                {/* V_OUTER — slow, deliberate pen-draw from tail to tail */}
                {animate ? (
                    <motion.path
                        d={V_OUTER}
                        {...strokeProps}
                        initial={{ pathLength: 0, opacity: 0.25 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.9, ease: "easeInOut", delay: 0 }}
                    />
                ) : (
                    <path d={V_OUTER} {...strokeProps} />
                )}

                {/* V_INNER — delayed snap with overshoot, like an accent stroke */}
                {animate ? (
                    <motion.path
                        d={V_INNER}
                        {...strokeProps}
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{
                            pathLength: { duration: 0.55, ease: [0.2, 0.9, 0.3, 1.1], delay: 0.7 },
                            opacity: { duration: 0.25, ease: "easeOut", delay: 0.7 },
                        }}
                    />
                ) : (
                    <path d={V_INNER} {...strokeProps} strokeLinejoin="round" />
                )}

                {/* PUPIL_HALO — fades in once the inner V is nearly complete */}
                {animate ? (
                    <motion.circle
                        cx={102.7} cy={112} r={11.8}
                        fill="hsl(var(--background))"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, ease: "easeOut", delay: 1.1 }}
                    />
                ) : (
                    <circle cx={102.7} cy={112} r={11.8} fill="hsl(var(--background))" />
                )}

                {/* PUPIL_CORE — brand dot resolves last with a spring pop */}
                {animate ? (
                    <motion.circle
                        cx={102.6} cy={112} r={8.1}
                        fill="hsl(var(--brand))"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        transition={{
                            scale: { type: "spring", stiffness: 260, damping: 14, delay: 1.25 },
                            opacity: { duration: 0.2, delay: 1.25 },
                        }}
                    />
                ) : (
                    <circle cx={102.6} cy={112} r={8.1} fill="hsl(var(--brand))" />
                )}
            </g>
        </svg>
    );
}
