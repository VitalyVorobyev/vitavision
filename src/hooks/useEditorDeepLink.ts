import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { migrateLegacyConfig } from "../components/editor/algorithms/legacyConfig";
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
    config: unknown;
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

    let config: unknown = null;
    if (configParam) {
        try {
            // A link saved before the config forms were generated from the WASM schemas carries
            // the old flat camelCase config; it is rebuilt into the current document here, and
            // anywhere else the config is only ever the current shape.
            config = migrateLegacyConfig(algorithmId, JSON.parse(fromBase64Url(configParam)));
        } catch {
            // invalid config param — ignore
        }
    }

    return { algorithmId, config, sampleId: sampleParam };
}

/** Structural equality of two JSON values; object key order does not matter. */
function sameJson(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (Array.isArray(a) || Array.isArray(b)) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => sameJson(item, b[i]));
    }
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    const aKeys = Object.keys(a);
    const bRecord = b as Record<string, unknown>;
    return aKeys.length === Object.keys(bRecord).length
        && aKeys.every((key) => key in bRecord && sameJson((a as Record<string, unknown>)[key], bRecord[key]));
}

/**
 * The editor's query string for an algorithm and its config.
 *
 * A config equal to `defaultConfig` (what the editor would open with anyway) is left out of
 * the URL: the configs are whole WASM documents now, a few kilobytes for ring grids, so only a
 * config someone actually changed is worth carrying.
 */
export function buildDeepLinkSearch(
    currentSearch: string,
    algorithmId: string,
    config: unknown,
    defaultConfig?: unknown,
): string {
    const params = new URLSearchParams(currentSearch);
    params.set("algo", algorithmId);

    if (defaultConfig !== undefined && sameJson(config, defaultConfig)) {
        params.delete("config");
    } else {
        try {
            params.set("config", toBase64Url(JSON.stringify(config)));
        } catch {
            params.delete("config");
        }
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

    const syncToUrl = useCallback((algorithmId: string, config: unknown, defaultConfig?: unknown) => {
        const search = buildDeepLinkSearch(window.location.search, algorithmId, config, defaultConfig);
        const url = `${window.location.pathname}${search}${window.location.hash}`;
        window.history.replaceState(null, "", url);
    }, []);

    return { initialState, syncToUrl };
}
