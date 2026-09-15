import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { CoAuthor } from "../../lib/atlas/authorStats.ts";
import { graphKindAccent, graphRelColor } from "../../lib/graph/graphTheme.ts";

/**
 * Static SVG ego graph for an author page: the subject at the centre, the
 * top collaborators (by shared-paper count) on a fixed-radius ring around
 * them. No pan/zoom — purely a compact visual summary of `coAuthorsOf`.
 * Modelled on the `ConstellationThumb` pattern in NarrativeCard.tsx.
 */

const MAX_SHOWN = 12;
const SIZE = 420;
const CENTER = SIZE / 2;
const RING_RADIUS = 160;
const SUBJECT_RADIUS = 28;
const NODE_RADIUS = 20;

/** Surname (or the whole name for a single-token name), truncated. */
function shortLabel(name: string, max = 16): string {
    const parts = name.trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? name);
    return surname.length > max ? `${surname.slice(0, max - 1)}…` : surname;
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
        };
    });

    return (
        <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`Co-author graph for ${subjectName}`}
            style={{ width: "100%", maxWidth: 480 }}
            className="mx-auto block"
        >
            {positions.map(({ co, x, y }) => (
                <line
                    key={`edge-${co.id}`}
                    x1={CENTER}
                    y1={CENTER}
                    x2={x}
                    y2={y}
                    stroke={graphRelColor("compared_with")}
                    strokeWidth={Math.min(6, Math.max(1, co.shared))}
                    opacity={0.7}
                />
            ))}

            {positions.map(({ co, x, y }) => (
                <g
                    key={co.id}
                    role="link"
                    tabIndex={0}
                    aria-label={co.name}
                    onClick={() => goTo(co.id)}
                    onKeyDown={(event) => onKeyDown(event, co.id)}
                    style={{ cursor: "pointer" }}
                >
                    <circle cx={x} cy={y} r={NODE_RADIUS} fill={graphKindAccent("algorithm")} opacity={0.85} />
                    <text
                        x={x}
                        y={y + NODE_RADIUS + 13}
                        textAnchor="middle"
                        fontSize={11}
                        style={{ fill: "hsl(var(--muted-foreground))" }}
                    >
                        {shortLabel(co.name)}
                    </text>
                </g>
            ))}

            <circle cx={CENTER} cy={CENTER} r={SUBJECT_RADIUS} fill={graphKindAccent("model")} />
            <text
                x={CENTER}
                y={CENTER + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                style={{ fill: "hsl(var(--foreground))" }}
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
