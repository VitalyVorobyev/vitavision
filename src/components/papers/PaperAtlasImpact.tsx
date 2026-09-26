import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { contentGraph } from "../../generated/content-graph.ts";
import { groupCitingPagesByDomain, firstSentence } from "../../lib/atlas/paperView.ts";
import type { ScholarlyPageMeta } from "../../lib/atlas/scholarlyTypes.ts";
import KindBadge, { KindDot } from "./KindBadge.tsx";

/** `contentGraph` nodes can be `"failure-mode"`, but a page with `sources.primary`
 *  is always algorithm/model/concept — narrow defensively rather than widen `KindBadge`. */
function asBadgeKind(type: string): ScholarlyPageMeta["kind"] {
    return type === "algorithm" || type === "model" ? type : "concept";
}

interface PaperAtlasImpactProps {
    primaryPages: string[];
    citingPages: string[];
    pages: Record<string, ScholarlyPageMeta>;
    /** `<details>`-per-domain-group on mobile; flat always-expanded rows on desktop. */
    isDesktop: boolean;
}

function labelSectionClass() {
    return "text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground m-0";
}

function DomainChips({ entries }: { entries: { slug: string; title: string; kind: ScholarlyPageMeta["kind"] }[] }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {entries.map((entry) => (
                <Link
                    key={entry.slug}
                    to={`/atlas/${entry.slug}`}
                    className="inline-flex h-[26px] min-h-[26px] items-center gap-1.5 rounded border border-border bg-surface px-2.5 text-[13px] font-medium text-foreground no-underline transition-colors hover:border-border-strong"
                >
                    <KindDot kind={entry.kind} />
                    {entry.title}
                </Link>
            ))}
        </div>
    );
}

export default function PaperAtlasImpact({ primaryPages, citingPages, pages, isDesktop }: PaperAtlasImpactProps) {
    const groups = groupCitingPagesByDomain(citingPages, pages);
    const isEmpty = primaryPages.length === 0 && citingPages.length === 0;

    return (
        <section className="flex flex-col gap-3.5">
            <h2 className={labelSectionClass()}>In the Atlas</h2>

            {isEmpty && (
                <p className="m-0 text-[13.5px] text-muted-foreground">
                    No Atlas page is built on this paper yet.
                </p>
            )}

            {primaryPages.map((slug) => {
                const node = contentGraph.nodes[slug];
                if (!node) return null;
                return (
                    <Link
                        key={slug}
                        to={`/atlas/${slug}`}
                        className="flex flex-col gap-2 rounded-lg border border-[hsl(var(--graph-icon-border-model)/0.6)] bg-surface px-5 py-[18px] no-underline transition-colors hover:border-[hsl(var(--graph-icon-border-model))]"
                    >
                        <div className="flex items-center gap-2.5">
                            <KindBadge kind={asBadgeKind(node.type)} />
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Primary source of
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[20px] font-bold text-foreground">{node.title}</span>
                            <ArrowRight size={14} className="shrink-0 text-primary" aria-hidden="true" />
                        </div>
                        {node.summary && (
                            <p className="m-0 text-[14px] leading-[1.5] text-foreground/85">
                                {firstSentence(node.summary)}
                            </p>
                        )}
                    </Link>
                );
            })}

            {groups.length > 0 && (
                <div className="flex flex-col gap-3 pt-1.5">
                    <p className="m-0 text-[14px] text-foreground">
                        <strong className="font-semibold">
                            Cited as a reference by {citingPages.length} page{citingPages.length === 1 ? "" : "s"}
                        </strong>
                        , grouped by domain
                    </p>

                    {isDesktop
                        ? groups.map((group) => (
                              <div
                                  key={group.domain}
                                  className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[170px_minmax(0,1fr)]"
                              >
                                  <span className="pt-1 text-[13px] font-semibold text-foreground">
                                      {group.label}{" "}
                                      <span className="font-mono font-normal text-muted-foreground">
                                          {group.entries.length}
                                      </span>
                                  </span>
                                  <DomainChips entries={group.entries} />
                              </div>
                          ))
                        : groups.map((group, i) => (
                              <details
                                  key={group.domain}
                                  open={i === 0}
                                  className="rounded-lg border border-border bg-surface px-3.5"
                              >
                                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[14.5px] font-semibold text-foreground">
                                      {group.label}
                                      <span className="font-mono text-[12px] font-normal text-muted-foreground">
                                          {group.entries.length} page{group.entries.length === 1 ? "" : "s"}
                                      </span>
                                  </summary>
                                  <div className="pb-3.5 pt-1">
                                      <DomainChips entries={group.entries} />
                                  </div>
                              </details>
                          ))}
                </div>
            )}
        </section>
    );
}
