// LaneLabel — rotated small-caps caption naming a canvas edge's relation
// lanes (W/E/N/S). Extracted from GraphExplorer.tsx.

export interface LaneLabelProps {
    side: "W" | "E" | "N" | "S";
    top:  number;
    left: number;
}

export function LaneLabel({ side, top, left }: LaneLabelProps) {
    const text = {
        W: "builds on · extended from · fed by",
        E: "extended by · feeds into · used by",
        N: "compared with",
        S: "learned alternative of",
    }[side];

    return (
        <div
            style={{
                position:      "absolute",
                top,
                left,
                font:          "500 9.5px ui-monospace, Geist Mono, monospace",
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color:         "hsl(var(--muted-foreground))",
                whiteSpace:    "nowrap",
                pointerEvents: "none",
                transform:     side === "W" ? "rotate(-90deg)" : side === "E" ? "rotate(90deg)" : undefined,
            }}
        >
            {text}
        </div>
    );
}
