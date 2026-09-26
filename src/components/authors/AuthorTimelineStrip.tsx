import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { computeAuthorTimelineLayout, type TimelineEntry } from "../../lib/atlas/authorView.ts";
import { dotStyle, tickLabel } from "./authorTimelineDots.ts";

/** Desktop SVG strip: one dot per paper on a single year axis, with
 *  same-year labels stacked upward so they never collide. Split out of
 *  `AuthorTimeline.tsx` to keep that file focused on the legend/mobile
 *  switch. */
export default function AuthorTimelineStrip({ entries, width }: { entries: TimelineEntry[]; width: number }) {
    const layout = computeAuthorTimelineLayout(entries, width);
    const byId = new Map(entries.map((e) => [e.id, e]));
    const navigate = useNavigate();
    const goTo = (id: string) => navigate(`/papers/${id}`);
    const onKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goTo(id);
        }
    };

    return (
        <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width="100%"
            height="auto"
            role="img"
            aria-label={`Papers by year: ${entries.length} paper${entries.length === 1 ? "" : "s"}`}
        >
            <line
                x1={layout.axisX1}
                x2={layout.axisX2}
                y1={layout.axisY}
                y2={layout.axisY}
                stroke="hsl(var(--border-strong))"
                strokeWidth={1.5}
            />
            {layout.ticks.map((tick) => (
                <text
                    key={tick.year}
                    x={tick.x}
                    y={layout.height - 8}
                    textAnchor="middle"
                    fontFamily="var(--font-mono, ui-monospace)"
                    fontSize={11}
                    fill="hsl(var(--muted-foreground))"
                >
                    {tickLabel(tick.year)}
                </text>
            ))}

            {layout.points.map((p) => {
                const entry = byId.get(p.id);
                if (!entry) return null;
                const style = dotStyle(entry.state);
                // Centered labels on the outermost dots can overflow the SVG's
                // edges (a long title centered on the leftmost/rightmost year
                // clips against the viewBox) — anchor those to start/end from
                // the dot instead of centering.
                const edgeGuard = 60;
                const anchor =
                    p.x < layout.axisX1 + edgeGuard ? "start" : p.x > layout.axisX2 - edgeGuard ? "end" : "middle";
                return (
                    <g
                        key={p.id}
                        role="link"
                        tabIndex={0}
                        aria-label={`${entry.label} (${entry.year})`}
                        onClick={() => goTo(p.id)}
                        onKeyDown={(event) => onKeyDown(event, p.id)}
                        style={{ cursor: "pointer" }}
                    >
                        {p.stackIndex > 0 && (
                            <line
                                x1={p.x}
                                x2={p.x}
                                y1={p.labelY + 8}
                                y2={p.y - 8}
                                stroke="hsl(var(--border))"
                                strokeWidth={1}
                            />
                        )}
                        <text
                            x={p.x}
                            y={p.labelY}
                            textAnchor={anchor}
                            fontSize={12}
                            fontWeight={600}
                            fill="hsl(var(--foreground))"
                        >
                            {entry.label}
                        </text>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r={6}
                            fill={style.fill}
                            stroke={style.stroke}
                            strokeWidth={1.6}
                            strokeDasharray={style.dashed ? "2.5 2" : undefined}
                        />
                    </g>
                );
            })}
        </svg>
    );
}
