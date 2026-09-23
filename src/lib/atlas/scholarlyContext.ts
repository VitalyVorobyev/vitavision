import { createContext } from "react";
import type { ScholarlyIndex } from "../../generated/scholarly-index.ts";

export type ScholarlyStatus = "idle" | "loading" | "ready" | "error";

export interface ScholarlyState {
    index: ScholarlyIndex | null;
    status: ScholarlyStatus;
}

export interface ScholarlyContextValue extends ScholarlyState {
    /** Idempotent — the first call starts the fetch; later calls are no-ops.
     *  Called by `useScholarlyIndex` on mount, never by the provider itself. */
    request: () => void;
}

export const EMPTY_SCHOLARLY_STATE: ScholarlyState = { index: null, status: "idle" };

/** Internal context — consumed via the `useScholarlyIndex` hook. */
export const ScholarlyContext = createContext<ScholarlyContextValue>({
    ...EMPTY_SCHOLARLY_STATE,
    request: () => {},
});
