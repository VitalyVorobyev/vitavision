import { useSearchParams } from "react-router-dom";
import useAlgorithmsFilters from "../hooks/useAlgorithmsFilters.ts";
import AtlasCatalogView from "../components/algorithms/AtlasCatalogView.tsx";
import AtlasGraphView from "../components/algorithms/AtlasGraphView.tsx";
import AtlasNarrativesView from "../components/algorithms/AtlasNarrativesView.tsx";
import AtlasPeopleView from "../components/people/AtlasPeopleView.tsx";
import AtlasPapersView from "../components/papersIndex/AtlasPapersView.tsx";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";

export default function AlgorithmIndex() {
    const {
        filters,
        setKind,
        setQuery,
        setView,
        setProblem,
        setMode,
        setPersonFocus,
        toggleTag,
        setTags,
        reset,
    } = useAlgorithmsFilters();
    const [searchParams] = useSearchParams();
    const focusParam = searchParams.get("focus") ?? undefined;

    // Per handoff: `lg` and up (≥1024px) = sidebar layout; below = sheet layout.
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);
    const isAdmin = useIsAdmin();

    if (filters.view === "narratives") {
        return (
            <AtlasNarrativesView
                isDesktop={isDesktop}
                view={filters.view}
                setView={setView}
                isAdmin={isAdmin}
            />
        );
    }

    if (filters.view === "graph") {
        return (
            <AtlasGraphView
                isDesktop={isDesktop}
                view={filters.view}
                setView={setView}
                focusParam={focusParam}
            />
        );
    }

    if (filters.view === "people") {
        return (
            <AtlasPeopleView
                isDesktop={isDesktop}
                view={filters.view}
                setView={setView}
                mode={filters.mode}
                setMode={setMode}
                personId={filters.person}
                setPersonFocus={setPersonFocus}
                query={filters.query}
                setQuery={setQuery}
            />
        );
    }

    if (filters.view === "papers") {
        return (
            <AtlasPapersView
                isDesktop={isDesktop}
                view={filters.view}
                setView={setView}
                query={filters.query}
                setQuery={setQuery}
            />
        );
    }

    return (
        <AtlasCatalogView
            isDesktop={isDesktop}
            isAdmin={isAdmin}
            filters={filters}
            setKind={setKind}
            setQuery={setQuery}
            setView={setView}
            setProblem={setProblem}
            toggleTag={toggleTag}
            setTags={setTags}
            reset={reset}
        />
    );
}
