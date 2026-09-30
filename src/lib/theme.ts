import { useSyncExternalStore } from "react";

/*
 * The site's theme, on @vitavision/ui's controller (`initTheme`, `ThemeToggle`).
 *
 * The choice ("light" | "dark" | "system") is stored under `"theme"`: the key next-themes
 * used before, with the same values, so a returning visitor keeps their choice. The inline
 * script in index.html paints it (the `dark` class on <html>) before the first paint and
 * must stay in agreement with ui's `theme.ts`; main.tsx then calls `initTheme` so "system"
 * keeps following the OS.
 *
 * Everything here reads the painted class, never storage: the class is the one source of
 * truth for what is on screen, whoever set it.
 */

/** The `localStorage` key of the theme choice (shared with the inline script in index.html). */
export const THEME_STORAGE_KEY = "theme";

const FAVICON_FOR_DARK_UI = "/vv-favicon-light.svg";
const FAVICON_FOR_LIGHT_UI = "/vv-favicon-dark.svg";

function isDarkPainted(): boolean {
    return document.documentElement.classList.contains("dark");
}

function subscribe(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
}

/**
 * Whether the dark palette is on screen, following every change of the `dark` class.
 * The server (and so the prerendered HTML) renders the light answer.
 */
export function useIsDark(): boolean {
    return useSyncExternalStore(subscribe, isDarkPainted, () => false);
}

/**
 * Keep the favicon in step with the painted theme after load (the inline script in
 * index.html sets it once, before the first paint). Call once, on the client.
 */
export function syncFaviconWithTheme(): () => void {
    const apply = () => {
        const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (icon) icon.href = isDarkPainted() ? FAVICON_FOR_DARK_UI : FAVICON_FOR_LIGHT_UI;
    };
    apply();
    return subscribe(apply);
}
