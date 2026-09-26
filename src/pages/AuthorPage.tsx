import { useContext, useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead.tsx";
import AuthorHeader from "../components/authors/AuthorHeader.tsx";
import AuthorTimeline from "../components/authors/AuthorTimeline.tsx";
import AuthorContribution from "../components/authors/AuthorContribution.tsx";
import AuthorNarratives from "../components/authors/AuthorNarratives.tsx";
import AuthorPapersTable from "../components/authors/AuthorPapersTable.tsx";
import AuthorCoauthors from "../components/authors/AuthorCoauthors.tsx";
import { PapersContext } from "../lib/atlas/papersContext.ts";
import { useAuthorsIndex } from "../lib/atlas/useAuthorsIndex.ts";
import { useScholarlyIndex } from "../lib/atlas/useScholarlyIndex.ts";
import { coAuthorsOf } from "../lib/atlas/authorStats.ts";
import {
    authorNarrativesUnion,
    authorSeoDescription,
    buildAuthorPaperRows,
    buildAuthorSummary,
    buildCoAuthorRows,
    buildTimelineEntries,
    groupContributionByDomain,
} from "../lib/atlas/authorView.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";
import NotFound from "./NotFound.tsx";
import type { ScholarlyPageMeta, ScholarlyPaper } from "../lib/atlas/scholarlyTypes.ts";

// Referentially-stable empty fallbacks, so a `useMemo` dependency array never
// sees a "new" empty object/array on every render while the scholarly index
// or the author's own paper list are still unresolved.
const EMPTY_PAPER_IDS: string[] = [];
const EMPTY_SCHOLARLY_PAPERS: Record<string, ScholarlyPaper> = {};
const EMPTY_PAGES: Record<string, ScholarlyPageMeta> = {};
const EMPTY_COAUTHOR_PAPERS: Record<string, Record<string, string[]>> = {};

function AuthorPageSkeleton() {
    return (
        <div className="mx-auto max-w-[1100px] px-4 py-9 lg:px-8" aria-busy="true">
            <div className="flex max-w-[720px] animate-pulse flex-col gap-4">
                <div className="h-3 w-40 rounded bg-muted" />
                <div className="h-9 w-2/3 rounded bg-muted" />
                <div className="h-5 w-full rounded bg-muted" />
                <div className="h-24 w-full rounded bg-muted" />
            </div>
        </div>
    );
}

export default function AuthorPage() {
    const { id } = useParams<{ id: string }>();
    const authorsIndex = useAuthorsIndex();
    const { index: scholarly, status } = useScholarlyIndex();
    const papers = useContext(PapersContext);
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);

    const author = id ? authorsIndex.authors[id] : undefined;
    // Every hook below must run on every render regardless of whether `author`
    // resolves, so the early returns for "loading"/"redirect"/"not found"
    // further down never change the hook count between renders.
    const authorPaperIds = author?.papers ?? EMPTY_PAPER_IDS;

    const scholarlyAuthor = scholarly?.authors[id ?? ""];
    const scholarlyPapers = scholarly?.papers ?? EMPTY_SCHOLARLY_PAPERS;
    const pages = scholarly?.pages ?? EMPTY_PAGES;
    const coauthorPapers = scholarly?.coauthorPapers ?? EMPTY_COAUTHOR_PAPERS;

    const narratives = useMemo(
        () => authorNarrativesUnion(authorPaperIds, scholarlyPapers),
        [authorPaperIds, scholarlyPapers],
    );
    const summary = useMemo(
        () => buildAuthorSummary(scholarlyAuthor, authorPaperIds.length, narratives.length),
        [scholarlyAuthor, authorPaperIds.length, narratives.length],
    );
    const contributionGroups = useMemo(
        () => groupContributionByDomain(authorPaperIds, scholarlyPapers, pages),
        [authorPaperIds, scholarlyPapers, pages],
    );
    const timelineEntries = useMemo(
        () => buildTimelineEntries(authorPaperIds, papers, scholarlyPapers, pages),
        [authorPaperIds, papers, scholarlyPapers, pages],
    );
    const paperRows = useMemo(
        () => buildAuthorPaperRows(authorPaperIds, papers, scholarlyPapers, pages),
        [authorPaperIds, papers, scholarlyPapers, pages],
    );
    const coAuthors = useMemo(
        () => (id ? coAuthorsOf(id, authorsIndex, coauthorPapers) : []),
        [id, authorsIndex, coauthorPapers],
    );
    const coAuthorRows = useMemo(() => buildCoAuthorRows(coAuthors, papers), [coAuthors, papers]);

    // The identity index arrives asynchronously on the client (SSR/prerender
    // gets it synchronously). An empty register means "still loading", not
    // "unknown id" — check that before falling through to alias/404.
    const authorsLoaded = Object.keys(authorsIndex.authors).length > 0;

    if (!author) {
        if (!authorsLoaded) return <AuthorPageSkeleton />;
        const canonicalId = id ? authorsIndex.aliases[id] : undefined;
        if (canonicalId) return <Navigate to={`/authors/${canonicalId}`} replace />;
        return <NotFound />;
    }

    const papersLoaded = Object.keys(papers).length > 0;
    const scholarlyLoaded = status === "ready" && scholarly !== null;

    if (!papersLoaded || !scholarlyLoaded) {
        return <AuthorPageSkeleton />;
    }

    const description = authorSeoDescription(author.name, authorPaperIds.length, scholarlyAuthor?.pageCount ?? 0);

    return (
        <div className="mx-auto max-w-[1100px] px-4 py-9 lg:px-8">
            <SeoHead title={author.name} description={description} url={`/authors/${id}`} ogType="profile" />

            <div className="flex flex-col gap-9">
                <AuthorHeader id={id ?? ""} name={author.name} orcid={author.orcid} summary={summary} />

                <AuthorTimeline entries={timelineEntries} isDesktop={isDesktop} />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
                    <AuthorContribution groups={contributionGroups} isDesktop={isDesktop} />
                    <AuthorNarratives narratives={narratives} />
                </div>

                <AuthorPapersTable rows={paperRows} />

                <AuthorCoauthors
                    subjectId={id ?? ""}
                    subjectName={author.name}
                    coAuthors={coAuthors}
                    rows={coAuthorRows}
                />
            </div>
        </div>
    );
}
