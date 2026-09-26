import { Link } from "react-router-dom";
import { KindDot } from "../papers/KindBadge.tsx";
import type { ContributionGroup } from "../../lib/atlas/authorView.ts";

interface AuthorContributionProps {
    groups: ContributionGroup[];
    /** `<details>`-per-domain-group on mobile; flat always-expanded rows on desktop. */
    isDesktop: boolean;
}

function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] border border-[hsl(var(--graph-icon-border-model)/0.6)] bg-[hsl(var(--graph-icon-bg-model))]" />
                primary source
            </span>
            <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] border border-border bg-surface" />
                cited as a reference
            </span>
        </div>
    );
}

function Chips({ group }: { group: ContributionGroup }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {group.entries.map((entry) =>
                entry.isPrimary ? (
                    <Link
                        key={entry.slug}
                        to={`/atlas/${entry.slug}`}
                        className="inline-flex h-[26px] items-center rounded px-2.5 text-[13px] font-semibold no-underline transition-colors"
                        style={{
                            color: `hsl(var(--graph-icon-tint-${entry.kind}))`,
                            background: `hsl(var(--graph-icon-bg-${entry.kind}))`,
                            border: `1px solid hsl(var(--graph-icon-border-${entry.kind}))`,
                        }}
                    >
                        {entry.title}
                    </Link>
                ) : (
                    <Link
                        key={entry.slug}
                        to={`/atlas/${entry.slug}`}
                        className="inline-flex h-[26px] items-center gap-1.5 rounded border border-border bg-surface px-2.5 text-[13px] font-medium text-foreground no-underline transition-colors hover:border-border-strong"
                    >
                        <KindDot kind={entry.kind} />
                        {entry.title}
                    </Link>
                ),
            )}
        </div>
    );
}

/** Left column of the two-column contribution section: every Atlas page
 *  touched by the author's papers, grouped by domain. Primary-source pages
 *  render filled in their kind colour and list first within a group. */
export default function AuthorContribution({ groups, isDesktop }: AuthorContributionProps) {
    if (groups.length === 0) return null;

    return (
        <section className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Contribution to the Atlas
                </h2>
                {isDesktop && <Legend />}
            </div>

            {isDesktop ? (
                <div className="flex flex-col">
                    {groups.map((group) => (
                        <div
                            key={group.domain}
                            className="grid grid-cols-[170px_minmax(0,1fr)] items-start gap-4 border-t border-border py-3.5 first:border-t-0 first:pt-0"
                        >
                            <div className="flex flex-col gap-0.5 pt-0.5">
                                <span className="text-[15px] font-semibold text-foreground">{group.label}</span>
                                <span className="font-mono text-[11.5px] text-muted-foreground">
                                    {group.entries.length} page{group.entries.length === 1 ? "" : "s"}
                                </span>
                            </div>
                            <Chips group={group} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {groups.map((group, i) => (
                        <details key={group.domain} open={i === 0} className="rounded-lg border border-border bg-surface px-3.5">
                            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between text-[14.5px] font-semibold text-foreground">
                                {group.label}
                                <span className="font-mono text-[12px] font-normal text-muted-foreground">
                                    {group.entries.length} page{group.entries.length === 1 ? "" : "s"}
                                </span>
                            </summary>
                            <div className="pb-3.5">
                                <Chips group={group} />
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </section>
    );
}
