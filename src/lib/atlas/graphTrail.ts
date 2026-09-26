// graphTrail.ts — pure back/forward/navigate/jump trail state machine for the
// GraphExplorer, plus a React hook wiring it to component state, hover reset,
// and the ⌘[ / ⌘] keyboard shortcut. Extracted from GraphExplorer.tsx.

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { contentGraph } from "../../generated/content-graph.ts";

export interface TrailState {
    history: string[];
    current: string;
    future:  string[];
}

export type TrailAction =
    | { type: "back" }
    | { type: "forward" }
    | { type: "navigate"; slug: string }
    | { type: "jump"; index: number };

export function initialTrailState(current: string): TrailState {
    return { history: [], current, future: [] };
}

function back(state: TrailState): TrailState {
    if (state.history.length === 0) return state;
    const prev = state.history[state.history.length - 1];
    return {
        history: state.history.slice(0, -1),
        current: prev,
        future:  [state.current, ...state.future],
    };
}

function forward(state: TrailState): TrailState {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
        history: [...state.history, state.current],
        current: next,
        future:  state.future.slice(1),
    };
}

/**
 * Navigate to `slug`. Mirrors the desktop/mobile click contract exactly:
 *  - no-op for an unknown slug, or the already-current slug
 *  - "smart back" — clicking the immediate-previous history entry pops it (== back())
 *  - "smart forward" — clicking the next redo entry runs it (== forward())
 *  - otherwise pushes `current` onto history and clears the redo stack
 */
function navigate(state: TrailState, slug: string): TrailState {
    if (!(slug in contentGraph.nodes) || slug === state.current) return state;
    if (state.history.length > 0 && state.history[state.history.length - 1] === slug) {
        return back(state);
    }
    if (state.future.length > 0 && state.future[0] === slug) {
        return forward(state);
    }
    return { history: [...state.history, state.current], current: slug, future: [] };
}

function jump(state: TrailState, index: number): TrailState {
    const before = state.history.slice(0, index);
    const target = state.history[index];
    const popped = state.history.slice(index + 1);
    return {
        history: before,
        current: target,
        future:  [...popped, state.current, ...state.future],
    };
}

export function trailReducer(state: TrailState, action: TrailAction): TrailState {
    switch (action.type) {
        case "back":     return back(state);
        case "forward":  return forward(state);
        case "navigate": return navigate(state, action.slug);
        case "jump":     return jump(state, action.index);
    }
}

// ── useGraphTrail ────────────────────────────────────────────────────────────

export interface UseGraphTrailResult {
    history:       string[];
    current:       string;
    future:        string[];
    hover:         string | null;
    setHover:      (slug: string | null) => void;
    back:          () => void;
    forward:       () => void;
    navigate:      (slug: string) => void;
    jumpToHistory: (i: number) => void;
}

export function useGraphTrail(initialSlug: string | null): UseGraphTrailResult {
    const [state, dispatch] = useReducer(trailReducer, initialSlug ?? "", initialTrailState);
    const [hover, setHover] = useState<string | null>(null);
    // Destructured so `currentSlug` doesn't end in `.current` — eslint's
    // exhaustive-deps rule treats any `x.current` member access as a ref read
    // (and thus an invalid hook dependency), which is a false positive here
    // since `current` is just a TrailState field, not a ref.
    const { history, current: currentSlug, future } = state;

    const backFn = useCallback(() => {
        if (history.length === 0) return;
        dispatch({ type: "back" });
        setHover(null);
    }, [history.length]);

    const forwardFn = useCallback(() => {
        if (future.length === 0) return;
        dispatch({ type: "forward" });
        setHover(null);
    }, [future.length]);

    const navigateFn = useCallback((slug: string) => {
        if (!(slug in contentGraph.nodes) || slug === currentSlug) return;
        dispatch({ type: "navigate", slug });
        setHover(null);
    }, [currentSlug]);

    const jumpToHistory = useCallback((i: number) => {
        dispatch({ type: "jump", index: i });
        setHover(null);
    }, []);

    // Keep stable refs so the keydown handler can reach the latest callbacks
    // without resubscribing the listener on every navigation.
    const backRef    = useRef(backFn);
    const forwardRef = useRef(forwardFn);
    useEffect(() => { backRef.current    = backFn;    }, [backFn]);
    useEffect(() => { forwardRef.current = forwardFn; }, [forwardFn]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey;
            if (!meta) return;
            if (e.key === "[") { e.preventDefault(); backRef.current();    }
            if (e.key === "]") { e.preventDefault(); forwardRef.current(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return {
        history:  state.history,
        current:  state.current,
        future:   state.future,
        hover,
        setHover,
        back:     backFn,
        forward:  forwardFn,
        navigate: navigateFn,
        jumpToHistory,
    };
}
