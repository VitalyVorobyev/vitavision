import type { FC } from "react";
import DemoThumbnail from "./DemoThumbnail.tsx";

interface Props {
    slug: string;
    className?: string;
}

const bg = "bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--muted)))]";

function ChessResponseCover() {
    const cols = 4;
    const rows = 3;
    const cell = 36;
    const startX = (320 - cols * cell) / 2;
    const startY = (180 - rows * cell) / 2;

    const cells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({
                x: startX + c * cell,
                y: startY + r * cell,
                filled: (r + c) % 2 === 0,
            });
        }
    }

    const saddles = [];
    for (let r = 1; r < rows; r++) {
        for (let c = 1; c < cols; c++) {
            saddles.push({ x: startX + c * cell, y: startY + r * cell });
        }
    }

    return (
        <svg
            viewBox="0 0 320 180"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            aria-hidden="true"
        >
            {cells.map((c, i) => (
                <rect
                    key={i}
                    x={c.x}
                    y={c.y}
                    width={cell}
                    height={cell}
                    className={c.filled ? "text-foreground/55" : "text-foreground/8"}
                    fill="currentColor"
                />
            ))}
            {saddles.map((s, i) => (
                <g key={i}>
                    <circle cx={s.x} cy={s.y} r="20" className="text-brand" fill="currentColor" fillOpacity="0.12" />
                    <circle cx={s.x} cy={s.y} r="12" className="text-brand" fill="currentColor" fillOpacity="0.28" />
                    <circle cx={s.x} cy={s.y} r="6" className="text-brand" fill="currentColor" fillOpacity="0.85" />
                    <circle cx={s.x} cy={s.y} r="2" className="text-background" fill="currentColor" />
                </g>
            ))}
        </svg>
    );
}

const COVERS: Record<string, FC> = {
    "chess-response": ChessResponseCover,
};

export default function DemoCover({ slug, className }: Props) {
    const Cover = COVERS[slug];
    if (Cover) {
        return (
            <div className={`${bg} ${className ?? ""}`}>
                <Cover />
            </div>
        );
    }
    return <DemoThumbnail />;
}
