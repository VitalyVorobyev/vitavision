import { useEffect, useState } from "react";

export type ViewportMode = "phone" | "touch-tablet" | "desktop";

export interface ViewportSnapshot {
    width: number;
    hasTouch: boolean;
    hasFinePointer: boolean;
    canHover: boolean;
}

export function resolveViewportMode(snapshot: ViewportSnapshot): ViewportMode {
    const touchPrimary = snapshot.hasTouch && (!snapshot.hasFinePointer || !snapshot.canHover);
    if (touchPrimary) {
        return snapshot.width < 768 ? "phone" : "touch-tablet";
    }

    return "desktop";
}

function readViewportSnapshot(): ViewportSnapshot {
    if (typeof window === "undefined") {
        return {
            width: 1280,
            hasTouch: false,
            hasFinePointer: true,
            canHover: true,
        };
    }

    return {
        width: window.innerWidth,
        hasTouch: navigator.maxTouchPoints > 0,
        hasFinePointer: window.matchMedia("(pointer: fine)").matches,
        canHover: window.matchMedia("(hover: hover)").matches,
    };
}

export default function useViewportMode() {
    const [snapshot, setSnapshot] = useState<ViewportSnapshot>(() => readViewportSnapshot());

    useEffect(() => {
        const pointerQuery = window.matchMedia("(pointer: fine)");
        const hoverQuery = window.matchMedia("(hover: hover)");
        const update = () => setSnapshot(readViewportSnapshot());

        update();
        window.addEventListener("resize", update);
        pointerQuery.addEventListener("change", update);
        hoverQuery.addEventListener("change", update);

        return () => {
            window.removeEventListener("resize", update);
            pointerQuery.removeEventListener("change", update);
            hoverQuery.removeEventListener("change", update);
        };
    }, []);

    const mode = resolveViewportMode(snapshot);

    return {
        mode,
        width: snapshot.width,
        hasTouch: snapshot.hasTouch,
        isPhone: mode === "phone",
        isTouchTablet: mode === "touch-tablet",
        isDesktop: mode === "desktop",
        isTouchPrimary: mode !== "desktop",
    };
}
