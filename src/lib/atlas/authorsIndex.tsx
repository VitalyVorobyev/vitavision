import { useEffect, useState, type ReactNode } from "react";
import { AuthorsIndexContext, EMPTY_AUTHORS_INDEX } from "./authorsContext.ts";
import { AUTHORS_INDEX_URL, type AuthorsIndex } from "../../generated/authors-index.ts";

interface AuthorsProviderProps {
    /** Pre-resolved index. SSR/postbuild reads the JSON synchronously and
     *  passes it here so the prerender already has every author available. */
    initial?: AuthorsIndex;
    children: ReactNode;
}

/**
 * Lazy-loading provider for the authors index. SSR receives the full index via
 * `initial`; the client either reuses the hydrated index or fetches
 * `/authors-index.json` once on mount.
 */
export function AuthorsProvider({ initial, children }: AuthorsProviderProps) {
    const [index, setIndex] = useState<AuthorsIndex>(initial ?? EMPTY_AUTHORS_INDEX);

    useEffect(() => {
        if (Object.keys(index.authors).length > 0) return;
        if (typeof window === "undefined") return;
        let cancelled = false;
        fetch(AUTHORS_INDEX_URL)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data: AuthorsIndex) => {
                if (!cancelled) setIndex(data);
            })
            .catch(() => {
                // Network error / 404 — leave the index empty; consumers degrade to nothing.
            });
        return () => {
            cancelled = true;
        };
    }, [index]);

    return <AuthorsIndexContext.Provider value={index}>{children}</AuthorsIndexContext.Provider>;
}
