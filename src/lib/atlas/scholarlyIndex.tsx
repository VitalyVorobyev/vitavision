import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ScholarlyContext, type ScholarlyState } from "./scholarlyContext.ts";
import { SCHOLARLY_INDEX_URL, type ScholarlyIndex } from "../../generated/scholarly-index.ts";

interface ScholarlyProviderProps {
    /** Pre-resolved index. SSR/postbuild reads the JSON synchronously and
     *  passes it here so a prerendered paper page already has the data. */
    initial?: ScholarlyIndex;
    children: ReactNode;
}

/**
 * Lazy-loading provider for the scholarly index (~440 kB — people/papers
 * layer of the Atlas). Unlike `PapersProvider`/`AuthorsProvider`, this
 * provider never fetches on mount: ordinary Atlas pages that never render a
 * paper page or a People/Papers view must not pay for this download. The
 * fetch is started by the first consumer that calls `useScholarlyIndex`, via
 * the context's `request()` function, and is idempotent — later mounts (or
 * re-renders) reuse the in-flight/resolved state instead of re-fetching.
 */
export function ScholarlyProvider({ initial, children }: ScholarlyProviderProps) {
    const [state, setState] = useState<ScholarlyState>(() =>
        initial ? { index: initial, status: "ready" } : { index: null, status: "idle" },
    );
    const requestedRef = useRef(!!initial);

    const request = useCallback(() => {
        if (requestedRef.current) return;
        requestedRef.current = true;
        if (typeof window === "undefined") return;
        setState({ index: null, status: "loading" });
        fetch(SCHOLARLY_INDEX_URL)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data: ScholarlyIndex) => setState({ index: data, status: "ready" }))
            .catch(() => setState({ index: null, status: "error" }));
    }, []);

    const value = useMemo(() => ({ ...state, request }), [state, request]);

    return <ScholarlyContext.Provider value={value}>{children}</ScholarlyContext.Provider>;
}
