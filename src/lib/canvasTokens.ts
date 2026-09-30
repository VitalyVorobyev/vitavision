import { useMemo } from "react";

import { useIsDark } from "./theme";

/*
 * The @vitavision/ui tokens as literal colours, for surfaces that cannot resolve `var(--x)`:
 * Konva and Canvas 2D paint with colour strings, not class names. Hard-coding hex there is
 * what the token layer exists to prevent, so the tokens are read from the computed style at
 * runtime instead, and re-read when the theme changes.
 *
 * Two scopes:
 *
 * - `"page"` — the tokens as the page resolves them (light or dark, whichever is painted).
 * - `"well"` — the tokens as they resolve inside the image well. ui's `canvas` is the dark
 *   well an image or plot sits in, independent of the page theme, and the editor's overlays
 *   are drawn on the photograph in it: selection, halos and labels must read the same on a
 *   photograph whatever the chrome around it does. They resolve under `.dark`, through one
 *   hidden probe element, so both page themes get the well's values.
 *
 * Nothing touches the DOM at module scope: on the server (and in a test environment without
 * a stylesheet) every token reads as `transparent` rather than a stale copy of one theme.
 */

/** The ui tokens a canvas paints with, resolved to literal colours. */
export interface CanvasTokens {
    ground: string;
    surface: string;
    raised: string;
    overlay: string;
    line: string;
    lineStrong: string;
    canvas: string;
    fg: string;
    fgMuted: string;
    fgSubtle: string;
    signal: string;
    signalStrong: string;
    signalFg: string;
    normal: string;
    defect: string;
    warn: string;
}

/** Where the tokens are resolved: the page as painted, or the (always dark) image well. */
export type CanvasScope = "page" | "well";

const TOKENS: Record<keyof CanvasTokens, string> = {
    ground: "--ground",
    surface: "--surface",
    raised: "--raised",
    overlay: "--overlay",
    line: "--line",
    lineStrong: "--line-strong",
    canvas: "--canvas",
    fg: "--fg",
    fgMuted: "--fg-muted",
    fgSubtle: "--fg-subtle",
    signal: "--signal",
    signalStrong: "--signal-strong",
    signalFg: "--signal-fg",
    normal: "--normal",
    defect: "--defect",
    warn: "--warn",
};

/** What a token paints as when no stylesheet defines it (the server, a bare test DOM). */
const UNRESOLVED = "transparent";

let wellProbe: HTMLElement | null = null;

function scopeElement(scope: CanvasScope): Element | null {
    if (typeof document === "undefined" || typeof getComputedStyle !== "function") return null;
    if (scope === "page") return document.documentElement;
    if (wellProbe === null || !wellProbe.isConnected) {
        // `.dark` declares the dark values of every token, so an element carrying the class
        // resolves them whatever the page theme is. Hidden: it only exists to be read.
        wellProbe = document.createElement("span");
        wellProbe.className = "dark";
        wellProbe.hidden = true;
        wellProbe.setAttribute("aria-hidden", "true");
        wellProbe.dataset.canvasTokens = "well";
        document.body.appendChild(wellProbe);
    }
    return wellProbe;
}

/** Resolved palettes by scope and theme, filled only once the stylesheet has resolved them. */
const cache = new Map<string, CanvasTokens>();

/**
 * Read the tokens now. For code outside React (an adapter building features); components
 * use `useCanvasTokens`, which re-reads on a theme change.
 */
export function readCanvasTokens(scope: CanvasScope = "page"): CanvasTokens {
    const element = scopeElement(scope);
    const style = element ? getComputedStyle(element) : null;
    const entries = Object.entries(TOKENS).map(([key, token]) => [
        key,
        style?.getPropertyValue(token).trim() || UNRESOLVED,
    ]);
    return Object.fromEntries(entries) as CanvasTokens;
}

function tokensFor(scope: CanvasScope, dark: boolean): CanvasTokens {
    const key = `${scope}:${dark ? "dark" : "light"}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const tokens = readCanvasTokens(scope);
    // Cache only a resolved palette: before the stylesheet lands (dev, a test DOM) read again.
    if (tokens.signal !== UNRESOLVED) cache.set(key, tokens);
    return tokens;
}

/**
 * The tokens for a canvas, resolved once per theme (and shared by every caller in that
 * theme); a theme change re-renders the caller with the new palette. Call it once per
 * canvas component and pass the palette down to per-feature glyphs.
 */
export function useCanvasTokens(scope: CanvasScope = "page"): CanvasTokens {
    const dark = useIsDark();
    return useMemo(() => tokensFor(scope, dark), [scope, dark]);
}

/**
 * `#rrggbb` plus an alpha byte, for a fill that should tint rather than cover. A colour in
 * any other form (a token retuned to `oklch(...)`, say) is returned unchanged rather than
 * turned into a string the canvas would silently ignore.
 */
export function withAlpha(color: string, alpha: number): string {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    return `${color}${byte.toString(16).padStart(2, "0")}`;
}

/** The verdict tone of a detection score in [0, 1]: good, marginal or poor. */
export function scoreTone(score: number): "normal" | "warn" | "defect" {
    if (score >= 0.66) return "normal";
    if (score >= 0.33) return "warn";
    return "defect";
}
