import { useEffect, useState, type RefObject } from "react";

export interface Heading {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

/**
 * Extracts h1/h2/h3 headings from the referenced article element.
 * Re-runs when deps change (e.g. when html changes and article re-renders).
 * Returns [] while the element is not yet mounted or has no headings.
 */
export function useHeadings(articleRef: RefObject<HTMLElement | null>, deps: unknown[]): Heading[] {
    const [headings, setHeadings] = useState<Heading[]>([]);

    // oxlint-disable-next-line react/exhaustive-deps -- headings are read from the rendered DOM after commit, so setState in the effect is intended; re-runs are keyed by the caller's `deps`
    useEffect(() => {
        const el = articleRef.current;
        if (!el) return;

        const nodes = el.querySelectorAll<HTMLElement>("h1, h2, h3");
        const result: Heading[] = [];
        nodes.forEach((node) => {
            const id = node.id;
            if (!id) return;
            const text = node.textContent?.trim() ?? "";
            const level = node.tagName === "H1" ? 1 : node.tagName === "H2" ? 2 : 3;
            result.push({ id, text, level });
        });

        setHeadings(result);
        // oxlint-disable-next-line react/exhaustive-deps -- caller-supplied `deps` array is the intentional re-run trigger; articleRef is a stable ref
    }, deps);

    return headings;
}
