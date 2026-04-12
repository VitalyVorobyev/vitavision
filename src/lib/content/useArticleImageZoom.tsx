import { useEffect, type RefObject } from "react";

export function useArticleImageZoom(
    ref: RefObject<HTMLElement | null>,
    deps: unknown[],
): void {
    useEffect(() => {
        const root = ref.current;
        if (!root) return;

        const imgs = Array.from(
            root.querySelectorAll<HTMLImageElement>("img"),
        ).filter((img) => !img.closest("[data-vv-illustration]"));

        if (imgs.length === 0) return;

        let active: HTMLImageElement | null = null;
        let backdrop: HTMLDivElement | null = null;

        const close = () => {
            if (!active || !backdrop) return;
            active.classList.remove("vv-zoom-active");
            const b = backdrop;
            b.classList.remove("vv-zoom-backdrop-active");
            window.setTimeout(() => b.remove(), 250);
            active = null;
            backdrop = null;
            document.body.style.overflow = "";
        };

        const open = (img: HTMLImageElement) => {
            if (active) return;
            active = img;
            backdrop = document.createElement("div");
            backdrop.className = "vv-zoom-backdrop";
            backdrop.addEventListener("click", close);
            document.body.appendChild(backdrop);
            document.body.style.overflow = "hidden";
            requestAnimationFrame(() => {
                backdrop?.classList.add("vv-zoom-backdrop-active");
                img.classList.add("vv-zoom-active");
            });
        };

        const onClick = (e: MouseEvent) => {
            const img = e.currentTarget as HTMLImageElement;
            if (active === img) close();
            else open(img);
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };

        imgs.forEach((img) => {
            img.style.cursor = "zoom-in";
            img.addEventListener("click", onClick);
        });
        document.addEventListener("keydown", onKey);

        return () => {
            imgs.forEach((img) => {
                img.removeEventListener("click", onClick);
                img.style.cursor = "";
            });
            document.removeEventListener("keydown", onKey);
            close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
