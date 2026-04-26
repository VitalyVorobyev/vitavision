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

export interface ViewState {
    points: Point[];
    grid: GridConfig;
    layers: Layers;
    selectedId: string | null;
    hover: HoverTarget | null;
    // V2: occluders: Circle[]
}
