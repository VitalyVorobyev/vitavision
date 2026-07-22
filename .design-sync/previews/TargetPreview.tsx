import { useEffect, useReducer } from "react";
import { TargetPreview } from "vitcv";
import { targetGeneratorReducer } from "../../src/components/targetgen/reducer";
import { generatePreviewSvg } from "../../src/components/targetgen/svg";
import { validateConfig } from "../../src/components/targetgen/validation";
import {
    CHESSBOARD_PRESETS,
    CHARUCO_PRESETS,
    MARKERBOARD_PRESETS,
    RINGGRID_PRESETS,
    PUZZLEBOARD_PRESETS,
} from "../../src/components/targetgen/presets";
import type { TargetGeneratorState, TargetConfig, PageConfig } from "../../src/components/targetgen/types";

// ── Fetch shim for the two board types whose SVG generation needs runtime
// data (`charucoSvg` / `ringgridSvg` call `loadDictionary` / `loadCodebook`,
// which `fetch()` the app's `/arucodict/*.json` and `/ringgrid/codebook_*.json`
// from `public/`). The design-sync capture server only serves `ds-bundle/`,
// not the app's `public/` folder — the same gap `ds-entry.tsx` documents for
// `public/papers-index.json`. Real data, same shapes as the served files;
// see `.design-sync/learnings/wave2-targetgen.md`.
import dict4x4_250 from "../../public/arucodict/DICT_4X4_250_CODES.json";
import ringgridBaseline from "../../public/ringgrid/codebook_baseline.json";

declare global {
    interface Window {
        __dsTargetgenFetchPatched?: boolean;
    }
}

if (typeof window !== "undefined" && !window.__dsTargetgenFetchPatched) {
    window.__dsTargetgenFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
        if (url.endsWith("/arucodict/DICT_4X4_250_CODES.json")) {
            return Promise.resolve(
                new Response(JSON.stringify(dict4x4_250), { status: 200, headers: { "Content-Type": "application/json" } }),
            );
        }
        if (url.endsWith("/ringgrid/codebook_baseline.json")) {
            return Promise.resolve(
                new Response(JSON.stringify(ringgridBaseline), { status: 200, headers: { "Content-Type": "application/json" } }),
            );
        }
        return originalFetch(input, init);
    }) as typeof window.fetch;
}

function useGeneratedState(target: TargetConfig, page: PageConfig) {
    const [state, dispatch] = useReducer(targetGeneratorReducer, {
        target,
        page,
        previewSvg: "",
        validation: { errors: [], warnings: [] },
        configCache: {},
    } satisfies TargetGeneratorState);

    useEffect(() => {
        let cancelled = false;
        generatePreviewSvg(state.target, state.page).then((svg) => {
            if (cancelled) return;
            dispatch({ type: "SET_PREVIEW", svg, validation: validateConfig(state.target, state.page) });
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { state, dispatch };
}

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 640, height: 420 }} className="overflow-hidden rounded-lg border border-border">
            {children}
        </div>
    );
}

export const Chessboard = () => {
    const preset = CHESSBOARD_PRESETS[0];
    const { state, dispatch } = useGeneratedState(preset.target, preset.page);
    return (
        <Frame>
            <TargetPreview state={state} dispatch={dispatch} />
        </Frame>
    );
};

export const Charuco = () => {
    const preset = CHARUCO_PRESETS[0];
    const { state, dispatch } = useGeneratedState(preset.target, preset.page);
    return (
        <Frame>
            <TargetPreview state={state} dispatch={dispatch} />
        </Frame>
    );
};

export const MarkerBoard = () => {
    const preset = MARKERBOARD_PRESETS[0];
    const { state, dispatch } = useGeneratedState(preset.target, preset.page);
    return (
        <Frame>
            <TargetPreview state={state} dispatch={dispatch} />
        </Frame>
    );
};

export const RingGrid = () => {
    const preset = RINGGRID_PRESETS[0];
    const { state, dispatch } = useGeneratedState(preset.target, preset.page);
    return (
        <Frame>
            <TargetPreview state={state} dispatch={dispatch} />
        </Frame>
    );
};

export const PuzzleBoard = () => {
    const preset = PUZZLEBOARD_PRESETS[0];
    const { state, dispatch } = useGeneratedState(preset.target, preset.page);
    return (
        <Frame>
            <TargetPreview state={state} dispatch={dispatch} />
        </Frame>
    );
};
