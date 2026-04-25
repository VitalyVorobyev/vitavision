// Specimen components for the home tile row.
// Each is a pure SVG. They use the .group-hover:* pattern from Tailwind on
// the parent <Link>: an inner <g> or element can switch color via
// `group-hover:` classes. To keep the SVG portable and theme-safe, we drive
// accents with CSS custom props and let the parent flip a data attribute.
//
// Convention: the parent <Link> adds `.group` and the specimen reads
// `group-hover:text-brand` etc. via CSS. Specimens use currentColor for the
// accent; they inherit color from the nearest `color:` ancestor.

import * as React from "react";

export type SpecProps = { className?: string };

/**
 * Blog — stacked text lines. First line becomes brand-colored on parent hover.
 */
export function SpecBlog({ className }: SpecProps) {
    return (
        <svg
            viewBox="0 0 44 28"
            width={44}
            height={28}
            aria-hidden
            className={className}
        >
            {/* Headline — uses text color, parent flips to brand on hover */}
            <rect
                x="0" y="2" width="32" height="3" rx="1"
                className="fill-foreground/85 transition-colors duration-300 group-hover:fill-brand group-focus-visible:fill-brand"
            />
            <rect x="0" y="9"  width="44" height="1.5" rx="0.75" className="fill-muted-foreground/80" />
            <rect x="0" y="14" width="40" height="1.5" rx="0.75" className="fill-muted-foreground/60" />
            <rect x="0" y="19" width="36" height="1.5" rx="0.75" className="fill-muted-foreground/45" />
            <rect x="0" y="24" width="22" height="1.5" rx="0.75" className="fill-muted-foreground/30" />
        </svg>
    );
}

/**
 * Algorithms — tiny directed graph. Entry node + edges highlight on hover.
 */
export function SpecAlgorithms({ className }: SpecProps) {
    const nodes: [number, number][] = [[4, 14], [18, 6], [18, 22], [32, 14], [42, 8]];
    const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
    return (
        <svg
            viewBox="0 0 46 28"
            width={46}
            height={28}
            aria-hidden
            className={className}
        >
            {edges.map(([a, b], i) => (
                <line
                    key={i}
                    x1={nodes[a][0]} y1={nodes[a][1]}
                    x2={nodes[b][0]} y2={nodes[b][1]}
                    strokeWidth={1}
                    className="stroke-muted-foreground/55 transition-colors duration-300 group-hover:stroke-brand/70 group-focus-visible:stroke-brand/70"
                />
            ))}
            {nodes.map(([x, y], i) => {
                const isEntry = i === 0;
                return (
                    <circle
                        key={i}
                        cx={x} cy={y} r={2}
                        strokeWidth={1.2}
                        className={
                            isEntry
                                ? "fill-foreground stroke-foreground transition-colors duration-300 group-hover:fill-brand group-hover:stroke-brand group-focus-visible:fill-brand group-focus-visible:stroke-brand"
                                : "fill-background stroke-muted-foreground transition-colors duration-300 group-hover:stroke-brand group-focus-visible:stroke-brand"
                        }
                    />
                );
            })}
        </svg>
    );
}

/**
 * Editor — image frame with feature points and a dashed bounding box.
 */
export function SpecEditor({ className }: SpecProps) {
    const pts: [number, number][] = [
        [8, 6], [14, 10], [22, 8], [30, 12], [35, 7],
        [12, 18], [20, 22], [28, 20], [34, 24], [9, 24], [18, 14],
    ];
    return (
        <svg
            viewBox="0 0 44 30"
            width={44}
            height={30}
            aria-hidden
            className={className}
        >
            <rect
                x="0.5" y="0.5" width="43" height="29" rx="2"
                fill="none" strokeWidth={1}
                className="stroke-muted-foreground/60 transition-colors duration-300 group-hover:stroke-brand group-focus-visible:stroke-brand"
            />
            <line x1="2" y1="20" x2="42" y2="18" strokeWidth="0.8" className="stroke-muted-foreground/30" />
            {pts.map(([x, y], i) => (
                <circle
                    key={i}
                    cx={x} cy={y} r={1}
                    className="fill-foreground/80 transition-colors duration-300 group-hover:fill-brand group-focus-visible:fill-brand"
                />
            ))}
            <rect
                x="16" y="6" width="18" height="10"
                fill="none" strokeWidth="0.8" strokeDasharray="2 1.5"
                className="stroke-foreground/70 transition-colors duration-300 group-hover:stroke-brand group-focus-visible:stroke-brand"
            />
        </svg>
    );
}

/**
 * Targets — miniature 7×4 checkerboard. One cell becomes brand on hover.
 */
export function SpecTargets({ className }: SpecProps) {
    const cols = 7, rows = 4;
    const cw = 40 / cols, ch = 24 / rows;
    const cells: Array<{ r: number; c: number; dark: boolean }> = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({ r, c, dark: (r + c) % 2 === 0 });
        }
    }
    return (
        <svg
            viewBox="0 0 44 28"
            width={44}
            height={28}
            aria-hidden
            className={className}
        >
            <g transform="translate(2,2)">
                {cells.map(({ r, c, dark }, i) => {
                    const isAccent = r === 1 && c === 4;
                    if (isAccent) {
                        return (
                            <rect
                                key={i}
                                x={c * cw} y={r * ch} width={cw} height={ch}
                                className={
                                    // On hover: brand. Otherwise: foreground if dark, else transparent.
                                    dark
                                        ? "fill-foreground/85 transition-colors duration-300 group-hover:fill-brand group-focus-visible:fill-brand"
                                        : "fill-transparent transition-colors duration-300 group-hover:fill-brand group-focus-visible:fill-brand"
                                }
                            />
                        );
                    }
                    return dark ? (
                        <rect
                            key={i}
                            x={c * cw} y={r * ch} width={cw} height={ch}
                            className="fill-foreground/85"
                        />
                    ) : null;
                })}
                <rect
                    x="0" y="0" width={cols * cw} height={rows * ch}
                    fill="none" strokeWidth="0.8"
                    className="stroke-muted-foreground/55 transition-colors duration-300 group-hover:stroke-brand group-focus-visible:stroke-brand"
                />
            </g>
        </svg>
    );
}
