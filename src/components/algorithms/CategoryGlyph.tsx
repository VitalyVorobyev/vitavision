import type { AlgorithmCategory } from "../../lib/content/schema.ts";

interface CategoryGlyphProps {
    category: AlgorithmCategory;
}

export default function CategoryGlyph({ category }: CategoryGlyphProps) {
    return (
        <div className="w-full h-full bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--muted)))] flex items-center justify-center">
            <Glyph category={category} />
        </div>
    );
}

function Glyph({ category }: { category: AlgorithmCategory }) {
    const stroke = "currentColor";
    const className = "text-muted-foreground/40 w-[60%] h-[60%]";

    if (category === "corner-detection") {
        return (
            <svg
                viewBox="0 0 64 64"
                fill="none"
                className={className}
                aria-hidden="true"
            >
                <path d="M8 32 H56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 8 V56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="32" cy="32" r="4" fill={stroke} />
            </svg>
        );
    }

    if (category === "calibration-targets") {
        return (
            <svg
                viewBox="0 0 64 64"
                className={className}
                aria-hidden="true"
            >
                {[0, 1, 2].map((r) =>
                    [0, 1, 2].map((c) => (
                        <rect
                            key={`${r}-${c}`}
                            x={12 + c * 14}
                            y={12 + r * 14}
                            width="12"
                            height="12"
                            fill={(r + c) % 2 === 0 ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="1"
                        />
                    )),
                )}
            </svg>
        );
    }

    if (category === "subpixel-refinement") {
        return (
            <svg
                viewBox="0 0 64 64"
                fill="none"
                className={className}
                aria-hidden="true"
            >
                <circle cx="32" cy="32" r="22" stroke={stroke} strokeWidth="1.5" />
                <circle cx="32" cy="32" r="14" stroke={stroke} strokeWidth="1.5" />
                <circle cx="32" cy="32" r="6" stroke={stroke} strokeWidth="1.5" />
                <circle cx="32" cy="32" r="2" fill={stroke} />
            </svg>
        );
    }

    // calibration
    return (
        <span className="text-[clamp(1.5rem,60%,3rem)] font-serif italic text-muted-foreground/40 select-none leading-none" aria-hidden="true">
            ƒ
        </span>
    );
}
