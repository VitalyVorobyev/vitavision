import { useEffect, type RefObject } from "react";

/**
 * Finds `<pre><code class="language-mermaid">` blocks inside the referenced
 * element and renders them as SVG diagrams using mermaid.js.
 *
 * Mermaid is dynamically imported so it never runs during SSR.
 */
export function useMermaid(
    ref: RefObject<HTMLElement | null>,
    deps: unknown[],
): void {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const blocks = el.querySelectorAll("pre > code.language-mermaid");
        if (blocks.length === 0) return;

        let cancelled = false;

        (async () => {
            const { default: mermaid } = await import("mermaid");
            mermaid.initialize({ startOnLoad: false, theme: "dark" });

            for (let i = 0; i < blocks.length; i++) {
                if (cancelled) return;
                const code = blocks[i];
                const text = code.textContent ?? "";
                const id = `mermaid-${Date.now()}-${i}`;
                try {
                    const { svg } = await mermaid.render(id, text);
                    const wrapper = document.createElement("div");
                    wrapper.className = "mermaid-diagram my-6";
                    wrapper.innerHTML = svg;
                    code.parentElement?.replaceWith(wrapper);
                } catch {
                    /* invalid diagram — leave as code block */
                }
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
