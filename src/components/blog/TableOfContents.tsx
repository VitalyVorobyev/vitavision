import { useEffect, useState, type RefObject } from "react";
import { useHeadings } from "../../lib/content/useHeadings";

interface TableOfContentsProps {
    articleRef: RefObject<HTMLElement | null>;
    /** Pass the same deps array as other article hooks, e.g. [html] */
    deps: unknown[];
}

/**
 * Right-column table of contents with scrollspy active-item tracking.
 *
 * Scrollspy strategy: a throttled window scroll listener computes the active
 * heading as the last one whose top has crossed above a fixed band (20% of
 * viewport height from the top). If no heading has crossed yet, the first
 * heading wins. Scroll and resize events are coalesced with requestAnimationFrame.
 */
export default function TableOfContents({ articleRef, deps }: TableOfContentsProps) {
    const headings = useHeadings(articleRef, deps);
    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        if (headings.length === 0) return;

        const update = () => {
            const article = articleRef.current;
            if (!article) return;
            const threshold = window.innerHeight * 0.2;
            let nextActive = headings[0].id;
            for (const { id } of headings) {
                const el = article.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
                if (!el) continue;
                if (el.getBoundingClientRect().top <= threshold) {
                    nextActive = id;
                } else {
                    break;
                }
            }
            setActiveId(nextActive);
        };

        let rafId: number | null = null;
        const onScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                update();
                rafId = null;
            });
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [headings, articleRef]);

    if (headings.length === 0) return null;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
        setActiveId(id);
    };

    return (
        <nav aria-label="Table of contents">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans font-medium mb-3">
                Contents
            </p>
            <ol className="space-y-0.5">
                {headings.map(({ id, text, level }) => {
                    const isActive = id === activeId;
                    const baseClasses =
                        "block font-sans leading-snug py-1 border-l-2 transition-colors";
                    const levelClasses =
                        level === 1
                            ? "text-sm pl-3"
                            : level === 2
                                ? "text-sm pl-6"
                                : "text-xs pl-9";
                    const stateClasses = isActive
                        ? "text-[hsl(var(--article-heading))] font-medium border-[hsl(var(--accent))]"
                        : "text-muted-foreground border-transparent hover:text-foreground";

                    return (
                        <li key={id}>
                            <a
                                href={`#${id}`}
                                onClick={(e) => handleClick(e, id)}
                                className={`${baseClasses} ${levelClasses} ${stateClasses}`}
                            >
                                {text}
                            </a>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
