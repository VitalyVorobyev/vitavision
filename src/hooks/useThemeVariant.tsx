/**
 * useThemeVariant
 *
 * Manages the visual theme variant (aubergine | pine | oxblood) independently
 * of the dark/light mode which is handled by next-themes.
 *
 * The chosen variant is persisted to localStorage under the key
 * "theme-variant" and applied as a class on <html>:
 *   document.documentElement.classList → "theme-aubergine" | "theme-pine" | "theme-oxblood"
 *
 * Usage:
 *   const { variant, setVariant } = useThemeVariant();
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { type ThemeVariant, THEME_VARIANTS } from './themeVariantConstants';

export type { ThemeVariant };

const STORAGE_KEY = 'theme-variant';
const DEFAULT_VARIANT: ThemeVariant = 'aubergine';

const VARIANT_CLASSES: Record<ThemeVariant, string> = {
    aubergine: 'theme-aubergine',
    pine: 'theme-pine',
    oxblood: 'theme-oxblood',
};

// ── Internal helpers ────────────────────────────────────────────────────────

function readStoredVariant(): ThemeVariant {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && THEME_VARIANTS.includes(stored as ThemeVariant)) {
            return stored as ThemeVariant;
        }
    } catch {
        // localStorage unavailable (SSR, private browsing quota, etc.)
    }
    return DEFAULT_VARIANT;
}

function applyVariantClass(variant: ThemeVariant) {
    const root = document.documentElement;
    // Remove all variant classes then add the chosen one
    for (const cls of Object.values(VARIANT_CLASSES)) {
        root.classList.remove(cls);
    }
    root.classList.add(VARIANT_CLASSES[variant]);
}

// ── Context ─────────────────────────────────────────────────────────────────

interface ThemeVariantContextValue {
    variant: ThemeVariant;
    setVariant: (v: ThemeVariant) => void;
}

const ThemeVariantContext = createContext<ThemeVariantContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

interface ThemeVariantProviderProps {
    children: React.ReactNode;
}

export function ThemeVariantProvider({ children }: ThemeVariantProviderProps) {
    const [variant, setVariantState] = useState<ThemeVariant>(() => readStoredVariant());

    useEffect(() => {
        applyVariantClass(variant);
    }, [variant]);

    const setVariant = (next: ThemeVariant) => {
        setVariantState(next);
        applyVariantClass(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore write errors
        }
    };

    return (
        <ThemeVariantContext.Provider value={{ variant, setVariant }}>
            {children}
        </ThemeVariantContext.Provider>
    );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useThemeVariant(): ThemeVariantContextValue {
    const ctx = useContext(ThemeVariantContext);
    if (!ctx) {
        throw new Error('useThemeVariant must be used inside <ThemeVariantProvider>');
    }
    return ctx;
}

export default useThemeVariant;
