import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { CoAuthor } from "../../lib/atlas/authorStats.ts";
import { graphKindAccent } from "../../lib/graph/graphTheme.ts";

/**
 * Static SVG ego graph for an author page: the subject at the centre, the
 * top collaborators (by shared-paper count) on a fixed-radius ring around
 * them. Hollow ring nodes and edge thickness both scale with shared-paper
 * count, so the busiest collaborators read as visually heavier at a glance.
 * No pan/zoom — purely a compact visual summary of `coAuthorsOf`. Not
 * pannable, so it must never set `touch-action: none` — a phone should keep
 * scrolling the page normally when a finger lands on this graph.
 */

const MAX_SHOWN = 12;
const SIZE = 420;
const CENTER = SIZE / 2;
const RING_RADIUS = 155;
const SUBJECT_RADIUS = 26;
const MIN_NODE_RADIUS = 12;
const MAX_NODE_RADIUS = 20;
const MIN_STROKE = 1.5;
const MAX_STROKE = 5;

/** Surname (or the whole name for a single-token name), truncated. */
function shortLabel(name: string, max = 16): string {
    const parts = name.trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? name);
    return surname.length > max ? `${surname.slice(0, max - 1)}…` : surname;
}

/** Linear interpolation of `value` (0–`max`) into `[min, max]`. `max <= 0`
 *  (no signal to scale by) falls back to the midpoint of the output range. */
function scale(value: number, max: number, min: number, upper: number): number {
    if (max <= 0) return (min + upper) / 2;
    return min + (Math.min(value, max) / max) * (upper - min);
}

interface CoauthorEgoGraphProps {
    subjectName: string;
    coAuthors: CoAuthor[];
}

export function CoauthorEgoGraph({ subjectName, coAuthors }: CoauthorEgoGraphProps) {
    const navigate = useNavigate();
    if (coAuthors.length === 0) return null;

    const shown = coAuthors.slice(0, MAX_SHOWN);
    const overflow = coAuthors.length - shown.length;
    const maxShared = Math.max(...shown.map((c) => c.shared));

    const goTo = (id: string) => navigate(`/authors/${id}`);
    const onKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goTo(id);
        }
    };

    const positions = shown.map((co, i) => {
        const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
        return {
            co,
            x: CENTER + RING_RADIUS * Math.cos(angle),
            y: CENTER + RING_RADIUS * Math.sin(angle),
            radius: scale(co.shared, maxShared, MIN_NODE_RADIUS, MAX_NODE_RADIUS),
            strokeWidth: scale(co.shared, maxShared, MIN_STROKE, MAX_STROKE),
        };
    });

    const ringColor = graphKindAccent("algorithm");

    return (
        <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`Co-author graph for ${subjectName}`}
            style={{ width: "100%", maxWidth: 480 }}
            className="mx-auto block"
        >
            {positions.map(({ co, x, y, strokeWidth }) => (
                <line
                    key={`edge-${co.id}`}
                    x1={CENTER}
                    y1={CENTER}
                    x2={x}
                    y2={y}
                    stroke="hsl(var(--border-strong))"
                    strokeWidth={strokeWidth}
                />
            ))}

            {positions.map(({ co, x, y, radius }) => (
                <g
                    key={co.id}
                    role="link"
                    tabIndex={0}
                    aria-label={co.name}
                    onClick={() => goTo(co.id)}
                    onKeyDown={(event) => onKeyDown(event, co.id)}
                    style={{ cursor: "pointer" }}
                >
                    <circle cx={x} cy={y} r={radius} fill="hsl(var(--surface))" stroke={ringColor} strokeWidth={1.6} />
                    <text
                        x={x}
                        y={y + radius + 13}
                        textAnchor="middle"
                        fontSize={11.5}
                        style={{ fill: "hsl(var(--foreground))" }}
                    >
                        {shortLabel(co.name)}
                    </text>
                </g>
            ))}

            <circle cx={CENTER} cy={CENTER} r={SUBJECT_RADIUS} fill="hsl(var(--foreground))" />
            <text
                x={CENTER}
                y={CENTER + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                style={{ fill: "hsl(var(--background))" }}
            >
                {shortLabel(subjectName, 12)}
            </text>

            {overflow > 0 && (
                <text
                    x={CENTER}
                    y={SIZE - 6}
                    textAnchor="middle"
                    fontSize={11}
                    style={{ fill: "hsl(var(--muted-foreground))" }}
                >
                    +{overflow} more
                </text>
            )}
        </svg>
    );
}
