import { useContext, useEffect } from "react";
import { ScholarlyContext, type ScholarlyState } from "./scholarlyContext.ts";

/**
 * Hook for the scholarly index. Triggers the lazy fetch on first mount (via
 * the provider's idempotent `request()`) and returns the current state —
 * `"idle"`/`"loading"` while in flight, `"ready"` with `index` populated once
 * resolved, `"error"` if the fetch failed. Components that never call this
 * hook never cause the ~440 kB asset to be downloaded.
 */
export function useScholarlyIndex(): ScholarlyState {
    const { index, status, request } = useContext(ScholarlyContext);

    useEffect(() => {
        request();
    }, [request]);

    return { index, status };
}
