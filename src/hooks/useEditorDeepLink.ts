import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ALGORITHM_MANIFEST, DEFAULT_ALGORITHM_ID } from "../components/editor/algorithms/registry";
import type { SampleId } from "../store/editor/useEditorStore";

/* ── base64url helpers ───────────────────────────────────────── */

function toBase64Url(json: string): string {
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    return atob(padded);
}

const VALID_SAMPLE_IDS = new Set<SampleId>(["chessboard", "charuco", "markerboard", "ringgrid", "puzzleboard", "upload"]);

function parseSampleId(value: string | null): SampleId | null {
    if (value === null) {
        return null;
    }

    return VALID_SAMPLE_IDS.has(value as SampleId) ? value as SampleId : null;
}

/* ── public interface ────────────────────────────────────────── */

export interface DeepLinkState {
    algorithmId: string;
    config: unknown | null;
    sampleId: SampleId | null;
}

/**
 * Reads initial deep-link state from URL search params.
 * Call once on mount to seed ConfigurePanel state.
 */
export function readDeepLink(searchParams: URLSearchParams): DeepLinkState {
    const algoParam = searchParams.get("algo");
    const configParam = searchParams.get("config");
    const sampleParam = parseSampleId(searchParams.get("sample"));

    const algorithmId = algoParam && ALGORITHM_MANIFEST.some((e) => e.id === algoParam)
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

export function buildDeepLinkSearch(currentSearch: string, algorithmId: string, config: unknown): string {
    const params = new URLSearchParams(currentSearch);
    params.set("algo", algorithmId);

    try {
        const json = JSON.stringify(config);
        params.set("config", toBase64Url(json));
    } catch {
        params.delete("config");
    }

    const query = params.toString();
    return query.length > 0 ? `?${query}` : "";
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
        const search = buildDeepLinkSearch(window.location.search, algorithmId, config);
        const url = `${window.location.pathname}${search}${window.location.hash}`;
        window.history.replaceState(null, "", url);
    }, []);

    return { initialState, syncToUrl };
}
