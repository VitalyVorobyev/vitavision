import type { CSSProperties } from "react";
import { Toaster } from "sonner";

import { useIsDark } from "../../lib/theme";

/*
 * sonner's toaster in the site's theme. ui has no toast, so sonner stays; what changes is
 * that it follows the painted theme (not the OS alone) and paints with the ui tokens: an
 * `overlay` card, and the verdict colours for success / error / warning (`signal` for info)
 * on a tint of themselves, where ui holds them at 4.5:1 as text.
 */

const tint = (token: string, percent: number) =>
    `color-mix(in oklab, var(${token}) ${percent}%, var(--overlay))`;

function tone(name: string, token: string): Record<string, string> {
    return {
        [`--${name}-bg`]: tint(token, 10),
        [`--${name}-border`]: tint(token, 35),
        [`--${name}-text`]: `var(${token})`,
    };
}

const TOKEN_STYLE = {
    "--normal-bg": "var(--overlay)",
    "--normal-border": "var(--line)",
    "--normal-text": "var(--fg)",
    "--border-radius": "var(--radius-panel)",
    ...tone("success", "--normal"),
    ...tone("error", "--defect"),
    ...tone("warning", "--warn"),
    ...tone("info", "--signal"),
    fontFamily: "inherit",
} as CSSProperties;

export default function SiteToaster() {
    const isDark = useIsDark();
    return (
        <Toaster
            theme={isDark ? "dark" : "light"}
            richColors
            closeButton
            position="bottom-right"
            style={TOKEN_STYLE}
        />
    );
}
