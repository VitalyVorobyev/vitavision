import { useEffect, useState, type RefObject } from "react";

/**
 * Observes the `dark` class on `<html>` and returns the current theme.
 */
function useResolvedTheme(): "dark" | "light" {
    const [dark, setDark] = useState(() =>
        typeof document !== "undefined"
            ? document.documentElement.classList.contains("dark")
            : true,
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setDark(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    return dark ? "dark" : "light";
}

/**
 * Finds `<pre><code class="language-mermaid">` blocks inside the referenced
 * element and renders them as SVG diagrams using mermaid.js.
 *
 * Re-renders when the dark/light theme changes.
 * Mermaid is dynamically imported so it never runs during SSR.
 */
export function useMermaid(
    ref: RefObject<HTMLElement | null>,
    deps: unknown[],
): void {
    const theme = useResolvedTheme();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Collect mermaid sources — either from original code blocks
        // or from previously rendered diagram wrappers (on re-render).
        const codeBlocks = el.querySelectorAll("pre > code.language-mermaid");
        const diagrams = el.querySelectorAll(".mermaid-diagram");

        // Skip mermaid import entirely if no mermaid content is present
        if (codeBlocks.length === 0 && diagrams.length === 0) return;

        const sources: { node: Element; text: string }[] = [];
        codeBlocks.forEach((code) => {
            sources.push({ node: code.parentElement!, text: code.textContent ?? "" });
        });
        diagrams.forEach((wrapper) => {
            const src = wrapper.getAttribute("data-mermaid-source");
            if (src) sources.push({ node: wrapper, text: src });
        });

        let cancelled = false;

        (async () => {
            // Mermaid is the heaviest lazy chunk in the app (~470 kB shared deps
            // + ~430 kB cytoscape + ~256 kB katex for math-in-diagrams + per-
            // diagram modules). Everything is loaded only on pages that actually
            // contain a mermaid block, so non-article routes are unaffected. The
            // katex chunk in particular is dynamically imported by mermaid's
            // diagram renderers on demand — it does NOT come from the
            // `katex/dist/katex.min.css` import in main.tsx (CSS imports don't
            // pull in JS). Confirmed by build analysis: chunk-ICPOFSXX (mermaid
            // internals) is the sole importer of katex-*.js.
            const { default: mermaid } = await import("mermaid");
            mermaid.initialize({
                startOnLoad: false,
                theme: theme === "dark" ? "dark" : "default",
            });

            for (let i = 0; i < sources.length; i++) {
                if (cancelled) return;
                const { node, text } = sources[i];
                const id = `mermaid-${Date.now()}-${i}`;
                try {
                    const { svg } = await mermaid.render(id, text);
                    const wrapper = document.createElement("div");
                    wrapper.className = "mermaid-diagram flex justify-center";
                    wrapper.setAttribute("data-mermaid-source", text);
                    wrapper.innerHTML = svg;
                    node.replaceWith(wrapper);
                } catch {
                    /* invalid diagram — leave as-is */
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, theme]);
}
