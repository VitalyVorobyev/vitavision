import { useEffect, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import ChessResponseIllustration from "../../components/illustrations/ChessResponseIllustration.tsx";
import DelaunayVoronoiInlineIllustration from "../../components/illustrations/DelaunayVoronoiInlineIllustration.tsx";
import type { ChessResponsePattern, ChessResponsePreset } from "../../components/illustrations/chess-response/types";

function parsePattern(value: string | undefined): ChessResponsePattern | undefined {
    if (value === "corner" || value === "edge" || value === "stripe") {
        return value;
    }
    return undefined;
}

function parsePreset(value: string | undefined): ChessResponsePreset {
    return value === "compact" ? "compact" : "article";
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) return fallback;
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function useArticleIllustrations(
    ref: RefObject<HTMLElement | null>,
    deps: unknown[],
): void {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const hosts = element.querySelectorAll<HTMLElement>("[data-vv-illustration]");
        if (hosts.length === 0) return;

        const roots: Root[] = [];

        hosts.forEach((host) => {
            const kind = host.dataset.vvIllustration;
            if (kind === "chess-response") {
                const root = createRoot(host);
                roots.push(root);
                root.render(
                    <ChessResponseIllustration
                        preset={parsePreset(host.dataset.vvPreset)}
                        initialPattern={parsePattern(host.dataset.vvPattern)}
                        initialRotation={parseNumber(host.dataset.vvRotation, 22.5)}
                        showControls={parseBoolean(host.dataset.vvControls, true)}
                        initialAnimateRotation={parseBoolean(host.dataset.vvAnimateRotation, false)}
                    />,
                );
            } else if (kind === "delaunay-voronoi") {
                const root = createRoot(host);
                roots.push(root);
                root.render(
                    <DelaunayVoronoiInlineIllustration
                        showLegend={parseBoolean(host.dataset.vvLegend, false)}
                        initialLayers={{
                            grid:          parseBoolean(host.dataset.vvGrid, true),
                            delaunay:      parseBoolean(host.dataset.vvDelaunay, true),
                            voronoi:       parseBoolean(host.dataset.vvVoronoi, false),
                            circumcircles: parseBoolean(host.dataset.vvCircumcircles, false),
                        }}
                    />,
                );
            }
        });

        return () => {
            roots.forEach((root) => root.unmount());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
