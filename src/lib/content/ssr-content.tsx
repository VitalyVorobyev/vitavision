import { createContext, useContext } from "react";

export interface StaticContentContextValue {
    blogHtmlBySlug?: Record<string, string>;
    algorithmHtmlBySlug?: Record<string, string>;
    demoHtmlBySlug?: Record<string, string>;
    modelHtmlBySlug?: Record<string, string>;
}

const StaticContentContext = createContext<StaticContentContextValue | null>(null);

export const StaticContentProvider = StaticContentContext.Provider;

export function useStaticContent(): StaticContentContextValue | null {
    return useContext(StaticContentContext);
}
