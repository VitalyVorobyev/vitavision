import { lazy, type ComponentType } from "react";

export interface DemoRegistryEntry {
    component: ComponentType;
    title: string;
}

const ChessResponseDemo = lazy(
    () => import("../../components/illustrations/ChessResponseDemo"),
) as ComponentType;

const DelaunayVoronoiDemo = lazy(
    () => import("../../components/illustrations/DelaunayVoronoiDemo"),
) as ComponentType;

export const demoRegistry: Record<string, DemoRegistryEntry> = {
    "chess-response": {
        component: ChessResponseDemo,
        title: "ChESS detector response",
    },
    "delaunay-voronoi": {
        component: DelaunayVoronoiDemo,
        title: "Delaunay & Voronoi",
    },
};
