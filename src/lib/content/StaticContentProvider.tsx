import type { ReactNode } from "react";
import { StaticContentContext, type StaticContentContextValue } from "./ssr-content.tsx";

/** Supplies prerendered article HTML to the pages (see ssr-content.tsx). */
export function StaticContentProvider({
    value,
    children,
}: {
    value: StaticContentContextValue | null;
    children: ReactNode;
}) {
    return <StaticContentContext value={value}>{children}</StaticContentContext>;
}
