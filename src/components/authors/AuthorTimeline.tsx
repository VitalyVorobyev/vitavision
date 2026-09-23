import { Link } from "react-router-dom";
import { useElementWidth } from "../../hooks/useElementWidth.ts";
import type { TimelineEntry } from "../../lib/atlas/authorView.ts";
import { dotStyle } from "./authorTimelineDots.ts";
import AuthorTimelineStrip from "./AuthorTimelineStrip.tsx";

interface AuthorTimelineProps {
    entries: TimelineEntry[];
    /** Strip on desktop; a compact vertical year list on phones, where a wide
     *  SVG strip can't keep labels legible without overlapping. */
    isDesktop: boolean;
}

const BASE_WIDTH = 1000;

function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <svg width={11} height={11} aria-hidden="true">
                    <circle cx={5.5} cy={5.5} r={4.5} fill="hsl(var(--foreground))" stroke="hsl(var(--foreground))" strokeWidth={1.3} />
                </svg>
                primary source of a page
            </span>
            <span className="flex items-center gap-1.5">
                <svg width={11} height={11} aria-hidden="true">
                    <circle cx={5.5} cy={5.5} r={4.5} fill="hsl(var(--surface))" stroke="hsl(var(--foreground))" strokeWidth={1.3} />
                </svg>
                cited by a page
            </span>
            <span className="flex items-center gap-1.5">
                <svg width={11} height={11} aria-hidden="true">
                    <circle
                        cx={5.5}
                        cy={5.5}
                        r={4.5}
                        fill="hsl(var(--surface))"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.3}
                        strokeDasharray="2 1.5"
                    />
                </svg>
                no Atlas page yet
            </span>
        </div>
    );
}

/** Desktop strip: dots on a single year axis, same-year labels stacked
 *  upward. Mobile: a compact vertical list, newest first, since a wide SVG
 *  strip can't keep short labels legible at 390px. */
export default function AuthorTimeline({ entries, isDesktop }: AuthorTimelineProps) {
    const [boxRef, width] = useElementWidth<HTMLDivElement>(BASE_WIDTH);
    if (entries.length === 0) return null;

    return (
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Papers over time
                </h2>
                <Legend />
            </div>

            {isDesktop ? (
                <div ref={boxRef}>
                    <AuthorTimelineStrip entries={entries} width={width} />
                </div>
            ) : (
                <ol className="m-0 flex list-none flex-col gap-0 p-0">
                    {entries
                        .slice()
                        .reverse()
                        .map((e) => {
                            const style = dotStyle(e.state);
                            return (
                                <li key={e.id} className="border-t border-border first:border-t-0">
                                    <Link
                                        to={`/papers/${e.id}`}
                                        className="flex min-h-11 items-center gap-2.5 py-2 no-underline"
                                    >
                                        <span className="w-9 shrink-0 font-mono text-[12px] text-muted-foreground">
                                            {e.year}
                                        </span>
                                        <svg width={11} height={11} className="shrink-0" aria-hidden="true">
                                            <circle
                                                cx={5.5}
                                                cy={5.5}
                                                r={4.5}
                                                fill={style.fill}
                                                stroke={style.stroke}
                                                strokeWidth={1.3}
                                                strokeDasharray={style.dashed ? "2 1.5" : undefined}
                                            />
                                        </svg>
                                        <span className="text-[13.5px] font-medium text-foreground">{e.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                </ol>
            )}
        </section>
    );
}
