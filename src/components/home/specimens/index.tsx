// Specimen components for the home tile row.
// Each is a pure SVG. They rely on the parent <Link>'s `.group` class:
// accent elements switch color via `group-hover:` / `group-focus-visible:`
// utilities, so keyboard and pointer users see the same reveal.

export type SpecProps = { className?: string };

/** Blog — stacked text lines. Headline becomes brand on parent hover/focus. */
export function SpecBlog({ className }: SpecProps) {
    return (
        <svg
            viewBox="0 0 44 28"
            width={44}
            height={28}
            aria-hidden
            className={className}
        >
            <rect
                x="0" y="2" width="32" height="3" rx="1"
                className="fill-fg/85 transition-colors duration-300 group-hover:fill-signal group-focus-visible:fill-signal"
            />
            <rect x="0" y="9"  width="44" height="1.5" rx="0.75" className="fill-fg-muted/80" />
            <rect x="0" y="14" width="40" height="1.5" rx="0.75" className="fill-fg-muted/60" />
            <rect x="0" y="19" width="36" height="1.5" rx="0.75" className="fill-fg-muted/45" />
            <rect x="0" y="24" width="22" height="1.5" rx="0.75" className="fill-fg-muted/30" />
        </svg>
    );
}

/** Algorithms — tiny directed graph. Entry node + edges highlight on hover. */
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
                    className="stroke-fg-muted/55 transition-colors duration-300 group-hover:stroke-signal/70 group-focus-visible:stroke-signal/70"
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
                                ? "fill-fg stroke-fg transition-colors duration-300 group-hover:fill-signal group-hover:stroke-signal group-focus-visible:fill-signal group-focus-visible:stroke-signal"
                                : "fill-ground stroke-fg-muted transition-colors duration-300 group-hover:stroke-signal group-focus-visible:stroke-signal"
                        }
                    />
                );
            })}
        </svg>
    );
}

/** Editor — image frame with feature points and a dashed bounding box. */
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
                className="stroke-fg-muted/60 transition-colors duration-300 group-hover:stroke-signal group-focus-visible:stroke-signal"
            />
            <line x1="2" y1="20" x2="42" y2="18" strokeWidth="0.8" className="stroke-fg-muted/30" />
            {pts.map(([x, y], i) => (
                <circle
                    key={i}
                    cx={x} cy={y} r={1}
                    className="fill-fg/80 transition-colors duration-300 group-hover:fill-signal group-focus-visible:fill-signal"
                />
            ))}
            <rect
                x="16" y="6" width="18" height="10"
                fill="none" strokeWidth="0.8" strokeDasharray="2 1.5"
                className="stroke-fg/70 transition-colors duration-300 group-hover:stroke-signal group-focus-visible:stroke-signal"
            />
        </svg>
    );
}

/** Targets — miniature 7×4 checkerboard. One cell becomes brand on hover. */
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
                                    dark
                                        ? "fill-fg/85 transition-colors duration-300 group-hover:fill-signal group-focus-visible:fill-signal"
                                        : "fill-transparent transition-colors duration-300 group-hover:fill-signal group-focus-visible:fill-signal"
                                }
                            />
                        );
                    }
                    return dark ? (
                        <rect
                            key={i}
                            x={c * cw} y={r * ch} width={cw} height={ch}
                            className="fill-fg/85"
                        />
                    ) : null;
                })}
                <rect
                    x="0" y="0" width={cols * cw} height={rows * ch}
                    fill="none" strokeWidth="0.8"
                    className="stroke-fg-muted/55 transition-colors duration-300 group-hover:stroke-signal group-focus-visible:stroke-signal"
                />
            </g>
        </svg>
    );
}
