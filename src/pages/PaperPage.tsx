import { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead.tsx";
import PaperHeader from "../components/papers/PaperHeader.tsx";
import PaperStats from "../components/papers/PaperStats.tsx";
import PaperAtlasImpact from "../components/papers/PaperAtlasImpact.tsx";
import PaperNarratives from "../components/papers/PaperNarratives.tsx";
import LineageStrip, { type LineageEntry } from "../components/papers/LineageStrip.tsx";
import LineageLists from "../components/papers/LineageLists.tsx";
import PaperRail, { type RailAuthor } from "../components/papers/PaperRail.tsx";
import { PapersContext } from "../lib/atlas/papersContext.ts";
import { useAuthorsIndex } from "../lib/atlas/useAuthorsIndex.ts";
import { useScholarlyIndex } from "../lib/atlas/useScholarlyIndex.ts";
import { computePaperStats, paperSeoDescription, sameAuthorsPapers } from "../lib/atlas/paperView.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";
import NotFound from "./NotFound.tsx";

interface LineageColumnEntry extends LineageEntry {
    authors: string[];
}

function surnameOf(name: string): string {
    return name.trim().split(/\s+/).pop() ?? name;
}

function PaperPageSkeleton() {
    return (
        <div className="mx-auto max-w-[1100px] px-4 py-9 lg:px-8" aria-busy="true">
            <div className="flex max-w-[720px] animate-pulse flex-col gap-4">
                <div className="h-3 w-40 rounded bg-muted" />
                <div className="h-9 w-full rounded bg-muted" />
                <div className="h-9 w-3/4 rounded bg-muted" />
                <div className="h-5 w-1/2 rounded bg-muted" />
                <div className="h-20 w-full rounded bg-muted" />
            </div>
        </div>
    );
}

export default function PaperPage() {
    const { id } = useParams<{ id: string }>();
    const papers = useContext(PapersContext);
    const authorsIndex = useAuthorsIndex();
    const { index: scholarly, status } = useScholarlyIndex();
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);

    const papersLoaded = Object.keys(papers).length > 0;
    const authorsLoaded = Object.keys(authorsIndex.authors).length > 0;
    const scholarlyLoaded = status === "ready" && scholarly !== null;

    const paper = id ? papers[id] : undefined;

    const canonicalAuthorIds = useMemo(
        () => (id ? (authorsIndex.paperAuthors[id] ?? []) : []),
        [id, authorsIndex.paperAuthors],
    );

    const scholarlyPaper = id ? scholarly?.papers[id] : undefined;
    const pages = scholarly?.pages ?? {};

    const sameAuthors = useMemo(
        () => (id && scholarlyLoaded ? sameAuthorsPapers(id, canonicalAuthorIds, authorsIndex, papers) : []),
        [id, scholarlyLoaded, canonicalAuthorIds, authorsIndex, papers],
    );

    if (!papersLoaded || !authorsLoaded || !scholarlyLoaded) {
        return <PaperPageSkeleton />;
    }

    if (!paper) {
        return <NotFound />;
    }

    const stats = computePaperStats(scholarlyPaper);
    const primaryPages = scholarlyPaper?.primaryPages ?? [];
    const citingPages = scholarlyPaper?.citingPages ?? [];
    const narratives = scholarlyPaper?.narratives ?? [];

    const toLineageEntries = (ids: string[]): LineageColumnEntry[] =>
        ids
            .map((pid) => papers[pid])
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({ id: p.id, year: p.year, title: p.title, authors: p.authors }));

    const citesEntries = toLineageEntries(scholarlyPaper?.cites ?? []);
    const citedByEntries = toLineageEntries(scholarlyPaper?.citedBy ?? []);

    const railAuthors: RailAuthor[] = canonicalAuthorIds.map((authorId) => {
        const ref = authorsIndex.authors[authorId];
        return {
            id: authorId,
            name: ref?.name ?? authorId,
            paperCount: ref?.papers.length ?? 0,
            pageCount: scholarly?.authors[authorId]?.pageCount ?? 0,
        };
    });

    const nameOf = (authorId: string): string => surnameOf(authorsIndex.authors[authorId]?.name ?? authorId);

    const description = paperSeoDescription(paper, primaryPages.length);

    return (
        <div className="mx-auto max-w-[1100px] px-4 py-9 lg:px-8">
            <SeoHead title={paper.title} description={description} url={`/papers/${paper.id}`} ogType="article" />

            <div className="grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
                <div className="flex min-w-0 flex-col gap-9 lg:max-w-[720px]">
                    <PaperHeader paper={paper} authorsIndex={authorsIndex} primarySlug={primaryPages[0]} />
                    <PaperStats stats={stats} />
                    <PaperAtlasImpact
                        primaryPages={primaryPages}
                        citingPages={citingPages}
                        pages={pages}
                        isDesktop={isDesktop}
                    />
                    <PaperNarratives narratives={narratives} />

                    <section className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Lineage
                            </h2>
                            <span className="text-[12.5px] text-muted-foreground">
                                Papers in the Atlas registry only · one dot per paper
                            </span>
                        </div>
                        <LineageStrip paperYear={paper.year} cites={citesEntries} citedBy={citedByEntries} />
                        {isDesktop ? (
                            <LineageLists cites={citesEntries} citedBy={citedByEntries} />
                        ) : (
                            <MobileLineageDisclosure cites={citesEntries} citedBy={citedByEntries} />
                        )}
                    </section>
                </div>

                <PaperRail paper={paper} authors={railAuthors} sameAuthorPapers={sameAuthors} nameOf={nameOf} />
            </div>
        </div>
    );
}

function MobileLineageDisclosure({ cites, citedBy }: { cites: LineageColumnEntry[]; citedBy: LineageColumnEntry[] }) {
    return (
        <details className="group">
            <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground">
                Builds on {cites.length} · Built upon by {citedBy.length}
            </summary>
            <div className="pt-4">
                <LineageLists cites={cites} citedBy={citedBy} />
            </div>
        </details>
    );
}
