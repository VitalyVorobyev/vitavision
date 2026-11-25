import { createContext, use } from "react";

export interface StaticContentContextValue {
    blogHtmlBySlug?: Record<string, string>;
    algorithmHtmlBySlug?: Record<string, string>;
    demoHtmlBySlug?: Record<string, string>;
    modelHtmlBySlug?: Record<string, string>;
    conceptHtmlBySlug?: Record<string, string>;
    /** Narrative essay HTML only — the constellation graph always loads client-side. */
    narrativeHtmlBySlug?: Record<string, string>;
}

export const StaticContentContext = createContext<StaticContentContextValue | null>(null);

export function useStaticContent(): StaticContentContextValue | null {
    return use(StaticContentContext);
}
