import { useEffect, useState, type ReactNode } from "react";
import { PapersContext } from "./papersContext.ts";
import { PAPERS_INDEX_URL, type PapersById } from "../../generated/papers-index.ts";

interface PapersProviderProps {
    /** Pre-resolved record map. SSR/postbuild reads the JSON synchronously and
     *  passes it here so the prerender already has every paper available. */
    initial?: PapersById;
    children: ReactNode;
}

/**
 * Lazy-loading provider for the papers index. SSR receives the full map via
 * `initial`; the client either reuses the hydrated map or fetches
 * `/papers-index.json` once on mount.
 */
export function PapersProvider({ initial, children }: PapersProviderProps) {
    const [papers, setPapers] = useState<PapersById>(initial ?? {});

    useEffect(() => {
        if (Object.keys(papers).length > 0) return;
        if (typeof window === "undefined") return;
        let cancelled = false;
        fetch(PAPERS_INDEX_URL, { cache: "force-cache" })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data: PapersById) => {
                if (!cancelled) setPapers(data);
            })
            .catch(() => {
                // Network error / 404 — leave papers empty; SourceStrip degrades to nothing.
            });
        return () => {
            cancelled = true;
        };
    }, [papers]);

    return <PapersContext.Provider value={papers}>{children}</PapersContext.Provider>;
}
