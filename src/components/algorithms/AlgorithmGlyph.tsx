import type { FC } from "react";
import type { AlgorithmCategory } from "../../lib/content/schema.ts";
import CategoryGlyph from "./CategoryGlyph.tsx";

interface Props {
    slug: string;
    category?: AlgorithmCategory;
}

const bg = "bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--muted)))]";
const svgClass = "w-[78%] h-[78%]";

function CornerMark({ cx, cy, accent = false }: { cx: number; cy: number; accent?: boolean }) {
    const klass = accent ? "text-brand" : "text-foreground/70";
    return (
        <g className={klass} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} />
            <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} />
        </g>
    );
}

function HarrisGlyph() {
    return (
        <svg viewBox="0 0 64 64" className={svgClass} fill="none" aria-hidden="true">
            <rect x="14" y="14" width="36" height="36" className="text-foreground/45" stroke="currentColor" strokeWidth="1.3" rx="1.5" />
            <g className="text-foreground/20" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2">
                <line x1="14" y1="22" x2="50" y2="22" />
                <line x1="14" y1="42" x2="50" y2="42" />
            </g>
            <CornerMark cx={14} cy={14} accent />
            <CornerMark cx={50} cy={14} />
            <CornerMark cx={14} cy={50} />
            <CornerMark cx={50} cy={50} />
        </svg>
    );
}

function ShiTomasiGlyph() {
    const features = [
        { x: 18, y: 16 },
        { x: 46, y: 20 },
        { x: 28, y: 32 },
        { x: 48, y: 42 },
        { x: 16, y: 46 },
        { x: 38, y: 50 },
    ];
    return (
        <svg viewBox="0 0 64 64" className={svgClass} fill="none" aria-hidden="true">
            <rect x="10" y="10" width="44" height="44" className="text-foreground/35" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" rx="2" />
            <g className="text-foreground/15" stroke="currentColor" strokeWidth="0.7">
                <line x1="14" y1="24" x2="50" y2="18" />
                <line x1="14" y1="38" x2="50" y2="44" />
                <line x1="22" y1="14" x2="28" y2="50" />
                <line x1="42" y1="14" x2="44" y2="50" />
            </g>
            {features.map((f, i) => (
                <CornerMark key={i} cx={f.x} cy={f.y} accent={i === 2} />
            ))}
        </svg>
    );
}

function FastGlyph() {
    const cx = 32;
    const cy = 32;
    const r = 20;
    const n = 16;
    const accent = new Set([13, 14, 15, 0, 1, 2, 3, 4, 5]);
    const dots = Array.from({ length: n }, (_, i) => {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), on: accent.has(i) };
    });
    return (
        <svg viewBox="0 0 64 64" className={svgClass} fill="none" aria-hidden="true">
            <circle cx={cx} cy={cy} r={r} className="text-foreground/15" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 2" />
            {dots.map((d, i) => (
                <rect
                    key={i}
                    x={d.x - 1.8}
                    y={d.y - 1.8}
                    width={3.6}
                    height={3.6}
                    className={d.on ? "text-brand" : "text-foreground/40"}
                    fill="currentColor"
                />
            ))}
            <rect x={cx - 2.5} y={cy - 2.5} width="5" height="5" className="text-foreground/80" fill="currentColor" />
            <rect x={cx - 1} y={cy - 1} width="2" height="2" className="text-background" fill="currentColor" />
        </svg>
    );
}

function ChessCornersGlyph() {
    const cell = 12;
    const start = 10;
    const cells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            cells.push({ x: start + c * cell, y: start + r * cell, filled: (r + c) % 2 === 0 });
        }
    }
    const saddles = [];
    for (let r = 1; r < 4; r++) {
        for (let c = 1; c < 4; c++) {
            saddles.push({ x: start + c * cell, y: start + r * cell });
        }
    }
    return (
        <svg viewBox="0 0 64 64" className={svgClass} fill="none" aria-hidden="true">
            {cells.map((cell, i) => (
                <rect
                    key={i}
                    x={cell.x}
                    y={cell.y}
                    width="12"
                    height="12"
                    className={cell.filled ? "text-foreground/65" : "text-foreground/8"}
                    fill="currentColor"
                />
            ))}
            {saddles.map((s, i) => (
                <g key={i} className="text-brand" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1={s.x - 2.5} y1={s.y - 2.5} x2={s.x + 2.5} y2={s.y + 2.5} />
                    <line x1={s.x + 2.5} y1={s.y - 2.5} x2={s.x - 2.5} y2={s.y + 2.5} />
                </g>
            ))}
        </svg>
    );
}

function DemoBlocksGlyph() {
    return (
        <svg viewBox="0 0 64 64" className={svgClass} fill="none" aria-hidden="true">
            <rect x="10" y="8" width="44" height="48" rx="3" className="text-foreground/25" stroke="currentColor" strokeWidth="1.2" />
            <rect x="16" y="14" width="32" height="14" rx="1" className="text-brand" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.8" />
            <g className="text-foreground/45" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <line x1="16" y1="34" x2="48" y2="34" />
                <line x1="16" y1="40" x2="40" y2="40" />
                <line x1="16" y1="46" x2="44" y2="46" />
                <line x1="16" y1="52" x2="34" y2="52" />
            </g>
        </svg>
    );
}

const GLYPHS: Record<string, FC> = {
    "harris-corner-detector": HarrisGlyph,
    "shi-tomasi-corner-detector": ShiTomasiGlyph,
    "fast-corner-detector": FastGlyph,
    "chess-corners": ChessCornersGlyph,
    "02-demo-blocks": DemoBlocksGlyph,
};

export default function AlgorithmGlyph({ slug, category }: Props) {
    const Glyph = GLYPHS[slug];
    if (Glyph) {
        return (
            <div className={`w-full h-full ${bg} flex items-center justify-center`}>
                <Glyph />
            </div>
        );
    }
    if (category) return <CategoryGlyph category={category} />;
    return <div className={`w-full h-full ${bg}`} />;
}
