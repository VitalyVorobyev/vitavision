import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getAlgorithmById, DEFAULT_ALGORITHM_ID } from "../components/editor/algorithms/registry";

/* ── base64url helpers ───────────────────────────────────────── */

function toBase64Url(json: string): string {
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    return atob(padded);
}

/* ── public interface ────────────────────────────────────────── */

export interface DeepLinkState {
    algorithmId: string;
    config: unknown | null;
    sampleId: string | null;
}

/**
 * Reads initial deep-link state from URL search params.
 * Call once on mount to seed ConfigurePanel state.
 */
export function readDeepLink(searchParams: URLSearchParams): DeepLinkState {
    const algoParam = searchParams.get("algo");
    const configParam = searchParams.get("config");
    const sampleParam = searchParams.get("sample");

    const algorithmId = algoParam && getAlgorithmById(algoParam).id === algoParam
        ? algoParam
        : DEFAULT_ALGORITHM_ID;

    let config: unknown | null = null;
    if (configParam) {
        try {
            config = JSON.parse(fromBase64Url(configParam));
        } catch {
            // invalid config param — ignore
        }
    }

    return { algorithmId, config, sampleId: sampleParam };
}

/**
 * Hook that syncs editor state → URL search params via history.replaceState.
 * Does not trigger React Router re-renders.
 */
export function useDeepLinkSync() {
    const [searchParams] = useSearchParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
    const initialState = useMemo(() => readDeepLink(searchParams), []);

    const syncToUrl = useCallback((algorithmId: string, config: unknown) => {
        const params = new URLSearchParams();
        params.set("algo", algorithmId);

        try {
            const json = JSON.stringify(config);
            params.set("config", toBase64Url(json));
        } catch {
            // non-serializable config — skip
        }

        const url = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", url);
    }, []);

    return { initialState, syncToUrl };
}
