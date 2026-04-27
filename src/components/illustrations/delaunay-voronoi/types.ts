export interface Point {
    id: string;
    x: number;
    y: number;
    kind: "free" | "grid";
}

export interface GridConfig {
    rows: number;
    cols: number;
    // TL, TR, BR, BL in canvas coords
    corners: [Point, Point, Point, Point];
    // Per-node overrides — moves a projected grid point to an explicit position.
    // Keyed by the synthetic grid id (e.g. "g-2-3").
    overrides: Record<string, { x: number; y: number }>;
    // Grid ids the user has deleted. Skipped in projectGridPoints.
    deleted: string[];
}

export interface Layers {
    delaunay: boolean;
    voronoi: boolean;
    circumcircles: boolean;
    grid: boolean;
}

export interface HoverTarget {
    kind: "triangle" | "cell";
    index: number;
    area: number;
}

export type ActiveTool = "add" | "move" | "delete" | "grid" | "hover" | "more";

export interface ViewState {
    points: Point[];
    grid: GridConfig;
    layers: Layers;
    selectedId: string | null;
    hover: HoverTarget | null;
    activeTool: ActiveTool;
    pointer: { x: number; y: number } | null;
    gridPopoverOpen: boolean;
}
