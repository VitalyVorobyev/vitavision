import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import TagBadge from "../blog/TagBadge.tsx";
import SourceStrip from "./SourceStrip.tsx";

type Difficulty = "beginner" | "intermediate" | "advanced";
type PageKind = "algorithm" | "model" | "concept";

interface AtlasFrontmatter {
    title: string;
    date: string;
    updated?: string;
    readingTimeMinutes?: number;
    difficulty?: Difficulty;
    tags: string[];
    draft?: boolean;
    dev?: boolean;
    sources?: { primary?: string };
}

interface AtlasPageHeaderProps {
    backTo: string;
    backLabel: string;
    frontmatter: AtlasFrontmatter;
    /** Extra badges rendered on the right of the meta row (e.g. QualityBadge, model arch chips). */
    badges?: ReactNode;
    /** Page kind shown as a badge to the left of the title. */
    kind?: PageKind;
    /** When provided, renders a "View in graph" link at the end of the meta row. */
    slug?: string;
}

const KIND_CLASSES: Record<PageKind, string> = {
    algorithm: "text-brand border-brand/40",
    model:     "text-violet-600 dark:text-violet-400 border-violet-500/40",
    concept:   "text-muted-foreground border-border",
};

const DIFFICULTY_DOT: Record<Difficulty, string> = {
    advanced:     "bg-red-500",
    intermediate: "bg-amber-500",
    beginner:     "bg-emerald-500",
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
    advanced:     "Advanced",
    intermediate: "Intermediate",
    beginner:     "Beginner",
};

export default function AtlasPageHeader({ backTo, backLabel, frontmatter, badges, kind, slug }: AtlasPageHeaderProps) {
    return (
        <header className="space-y-4 mb-8">
            <Link
                to={backTo}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                &larr; {backLabel}
            </Link>
            <h1 className="text-[clamp(1.875rem,4vw,2.625rem)] font-bold tracking-[-0.03em] leading-[1.2]">
                {kind && (
                    <span aria-hidden="true" className={`text-sm font-mono uppercase tracking-wider border rounded px-2 py-1 mr-3 align-middle ${KIND_CLASSES[kind]}`}>
                        {kind}
                    </span>
                )}
                {frontmatter.dev && (
                    <span aria-hidden="true" className="text-sm font-mono uppercase tracking-wider text-blue-500 border border-blue-500/40 rounded px-2 py-1 mr-3 align-middle">
                        dev sample
                    </span>
                )}
                {frontmatter.draft && (
                    <span aria-hidden="true" className="text-sm font-mono uppercase tracking-wider text-amber-500 border border-amber-500/40 rounded px-2 py-1 mr-3 align-middle">
                        draft
                    </span>
                )}
                {frontmatter.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <time>{frontmatter.date}</time>
                {frontmatter.updated && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>Updated {frontmatter.updated}</span>
                    </>
                )}
                {frontmatter.readingTimeMinutes && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>{frontmatter.readingTimeMinutes} min read</span>
                    </>
                )}
                {frontmatter.difficulty && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                aria-hidden="true"
                                className={`inline-block w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOT[frontmatter.difficulty]}`}
                            />
                            <span>{DIFFICULTY_LABEL[frontmatter.difficulty]}</span>
                        </span>
                    </>
                )}
                {badges && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-2">{badges}</span>
                    </>
                )}
                {slug && (
                    <>
                        <span aria-hidden="true">·</span>
                        <Link
                            to={`/atlas?view=graph&focus=${slug}`}
                            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="3" />
                                <circle cx="5"  cy="5"  r="1.6" />
                                <circle cx="19" cy="5"  r="1.6" />
                                <circle cx="5"  cy="19" r="1.6" />
                                <circle cx="19" cy="19" r="1.6" />
                                <line x1="7" y1="6.5" x2="10" y2="10" />
                                <line x1="17" y1="6.5" x2="14" y2="10" />
                                <line x1="7" y1="17.5" x2="10" y2="14" />
                                <line x1="17" y1="17.5" x2="14" y2="14" />
                            </svg>
                            View in graph
                        </Link>
                    </>
                )}
            </div>
            <SourceStrip primary={frontmatter.sources?.primary} />
            {frontmatter.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            )}
            <div className="border-t border-border" />
        </header>
    );
}
