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
    poseModalOpen: boolean;
}
