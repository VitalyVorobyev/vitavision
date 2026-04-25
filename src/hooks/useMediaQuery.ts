import { useEffect, useState } from "react";

export default function useMediaQuery(query: string, fallback = false): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === "undefined") return fallback;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mq = window.matchMedia(query);
        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [query]);

    return matches;
}
