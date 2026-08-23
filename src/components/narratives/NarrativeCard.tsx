import { Link } from "react-router-dom";
import type { NarrativeIndexEntry } from "../../lib/content/schema.ts";
import { areaColor } from "../../lib/narratives/narrativeLayout.ts";

interface NarrativeCardProps {
    entry: NarrativeIndexEntry;
}

/**
 * Tiny constellation thumbnail drawn from the entry's `preview` coords (the
 * overview lens normalized to [0,1]).
 *
 * The index entry carries no node→area mapping, so dot colour cycles the
 * narrative's own area palette by position — decorative, not semantic.
 */
function ConstellationThumb({ entry }: { entry: NarrativeIndexEntry }) {
    const ids = Object.keys(entry.preview).sort();
    const areaIds = entry.areas.map((a) => a.id);
    if (ids.length === 0 || areaIds.length === 0) return null;

    const W = 96, H = 44, PAD = 5;

    return (
        <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            aria-hidden="true"
            className="shrink-0 rounded border border-border bg-muted/40"
        >
            {ids.map((id, i) => {
                const [nx, ny] = entry.preview[id];
                return (
                    <circle
                        key={id}
                        cx={PAD + nx * (W - 2 * PAD)}
                        cy={PAD + ny * (H - 2 * PAD)}
                        r={2.6}
                        fill={areaColor(areaIds, areaIds[i % areaIds.length])}
                        opacity={0.85}
                    />
                );
            })}
        </svg>
    );
}

export default function NarrativeCard({ entry }: NarrativeCardProps) {
    const areaIds = entry.areas.map((a) => a.id);

    return (
        <Link
            to={`/atlas/narratives/${entry.slug}`}
            className="group flex flex-col gap-2.5 rounded-[10px] border border-border bg-card p-4 no-underline transition-colors hover:border-border-strong"
        >
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-[15px] font-semibold leading-snug -tracking-[0.2px] text-foreground">
                        {entry.title}
                    </h3>
                    <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-muted-foreground line-clamp-3">
                        {entry.tagline ?? entry.summary}
                    </p>
                </div>
                <ConstellationThumb entry={entry} />
            </div>

            {entry.areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {entry.areas.map((a) => (
                        <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-[2px] text-[10.5px] text-muted-foreground"
                        >
                            <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: areaColor(areaIds, a.id) }}
                            />
                            {a.label}
                        </span>
                    ))}
                </div>
            )}

            <div className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {entry.stats.nodes} stop{entry.stats.nodes === 1 ? "" : "s"} · {entry.stats.steps} chapter
                {entry.stats.steps === 1 ? "" : "s"}
            </div>
        </Link>
    );
}
