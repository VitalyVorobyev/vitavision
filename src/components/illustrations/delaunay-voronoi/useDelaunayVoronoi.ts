import { useReducer, useMemo } from "react";
import { Delaunay } from "d3-delaunay";
import { v4 as uuid } from "uuid";
import { computeHomography, applyHomography } from "./homography";
import { triangleMinAngle } from "./geometry";
import { usePoseFromHomography } from "./usePoseFromHomography";
import type { Pose } from "./cameraPose";
import type { Point, GridConfig, Layers, ViewState, HoverTarget, ActiveTool } from "./types";

const W = 800;
const H = 600;

function defaultCorners(): [Point, Point, Point, Point] {
    const margin = 80;
    return [
        { id: "c0", x: margin, y: margin, kind: "grid" },
        { id: "c1", x: W - margin, y: margin, kind: "grid" },
        { id: "c2", x: W - margin, y: H - margin, kind: "grid" },
        { id: "c3", x: margin, y: H - margin, kind: "grid" },
    ];
}

function makeInitialState(): ViewState {
    return {
        points: [],
        grid: {
            rows: 6,
            cols: 8,
            corners: defaultCorners(),
        },
        layers: { delaunay: true, voronoi: false, circumcircles: false, grid: false },
        selectedId: null,
        hover: null,
        activeTool: "add",
        pointer: null,
        gridPopoverOpen: false,
        poseModalOpen: false,
    };
}

type Action =
    | { type: "ADD_POINT"; x: number; y: number }
    | { type: "MOVE_POINT"; id: string; x: number; y: number }
    | { type: "REMOVE_POINT"; id: string }
    | { type: "SELECT_POINT"; id: string | null }
    | { type: "SET_HOVER"; hover: HoverTarget | null }
    | { type: "TOGGLE_LAYER"; layer: keyof Layers }
    | { type: "SET_GRID_DIMS"; rows?: number; cols?: number }
    | { type: "MOVE_CORNER"; index: 0 | 1 | 2 | 3; x: number; y: number }
    | { type: "RESET_GRID" }
    | { type: "CLEAR_POINTS" }
    | { type: "RANDOM_POINTS"; count: number }
    | { type: "SET_TOOL"; tool: ActiveTool }
    | { type: "SET_POINTER"; pointer: { x: number; y: number } | null }
    | { type: "SET_GRID_POPOVER_OPEN"; open: boolean }
    | { type: "SET_POSE_MODAL_OPEN"; open: boolean };

function reducer(state: ViewState, action: Action): ViewState {
    switch (action.type) {
        case "ADD_POINT":
            return {
                ...state,
                points: [...state.points, { id: uuid(), x: action.x, y: action.y, kind: "free" }],
                selectedId: null,
            };
        case "MOVE_POINT": {
            const inPoints = state.points.some((p) => p.id === action.id);
            if (inPoints) {
                return {
                    ...state,
                    points: state.points.map((p) =>
                        p.id === action.id ? { ...p, x: action.x, y: action.y } : p,
                    ),
                };
            }
            const cornerIdx = state.grid.corners.findIndex((c) => c.id === action.id);
            if (cornerIdx >= 0) {
                const newCorners = state.grid.corners.map((c, i) =>
                    i === cornerIdx ? { ...c, x: action.x, y: action.y } : c,
                ) as [Point, Point, Point, Point];
                return { ...state, grid: { ...state.grid, corners: newCorners } };
            }
            return state;
        }
        case "REMOVE_POINT":
            return {
                ...state,
                points: state.points.filter((p) => p.id !== action.id),
                selectedId: state.selectedId === action.id ? null : state.selectedId,
            };
        case "SELECT_POINT":
            return { ...state, selectedId: action.id };
        case "SET_HOVER":
            return { ...state, hover: action.hover };
        case "TOGGLE_LAYER": {
            const next = !state.layers[action.layer];
            // Closing the grid layer also closes the popover.
            const gridPopoverOpen =
                action.layer === "grid" && !next ? false : state.gridPopoverOpen;
            return {
                ...state,
                layers: { ...state.layers, [action.layer]: next },
                gridPopoverOpen,
            };
        }
        case "SET_GRID_DIMS":
            return {
                ...state,
                grid: {
                    ...state.grid,
                    rows: action.rows ?? state.grid.rows,
                    cols: action.cols ?? state.grid.cols,
                },
            };
        case "MOVE_CORNER": {
            const newCorners = state.grid.corners.map((c, i) =>
                i === action.index ? { ...c, x: action.x, y: action.y } : c,
            ) as [Point, Point, Point, Point];
            return { ...state, grid: { ...state.grid, corners: newCorners } };
        }
        case "RESET_GRID":
            return { ...state, grid: { ...state.grid, corners: defaultCorners() } };
        case "CLEAR_POINTS":
            return { ...state, points: [], selectedId: null, hover: null };
        case "RANDOM_POINTS": {
            const padding = 40;
            const newPoints: Point[] = Array.from({ length: action.count }, () => ({
                id: uuid(),
                x: padding + Math.random() * (W - 2 * padding),
                y: padding + Math.random() * (H - 2 * padding),
                kind: "free" as const,
            }));
            return { ...state, points: newPoints, selectedId: null };
        }
        case "SET_TOOL": {
            // Activating grid tool: enable the grid layer and open the popover.
            if (action.tool === "grid") {
                return {
                    ...state,
                    activeTool: "grid",
                    layers: { ...state.layers, grid: true },
                    gridPopoverOpen: true,
                };
            }
            return { ...state, activeTool: action.tool };
        }
        case "SET_POINTER":
            return { ...state, pointer: action.pointer };
        case "SET_GRID_POPOVER_OPEN":
            return { ...state, gridPopoverOpen: action.open };
        case "SET_POSE_MODAL_OPEN":
            return { ...state, poseModalOpen: action.open };
        default:
            return state;
    }
}

function projectGridPoints(grid: GridConfig): Point[] {
    const H_mat = computeHomography(grid.corners);
    const pts: Point[] = [];
    for (let r = 0; r <= grid.rows; r++) {
        for (let c = 0; c <= grid.cols; c++) {
            const uv = applyHomography(H_mat, { x: c / grid.cols, y: r / grid.rows });
            pts.push({ id: `g-${r}-${c}`, x: uv.x, y: uv.y, kind: "grid" });
        }
    }
    return pts;
}

export interface TriangleInfo {
    ai: number;
    bi: number;
    ci: number;
}

export interface Stats {
    points: number;
    triangles: number;
    edges: number;
    minAngleDeg: number;
}

export interface DelaunayVoronoiState {
    state: ViewState;
    allPoints: Point[];
    delaunay: Delaunay<Point> | null;
    voronoi: ReturnType<Delaunay<Point>["voronoi"]> | null;
    triangles: TriangleInfo[];
    stats: Stats;
    pose: Pose;
    addPoint: (x: number, y: number) => void;
    movePoint: (id: string, x: number, y: number) => void;
    removePoint: (id: string) => void;
    selectPoint: (id: string | null) => void;
    setHover: (hover: HoverTarget | null) => void;
    toggleLayer: (layer: keyof Layers) => void;
    setGridDims: (rows?: number, cols?: number) => void;
    moveCorner: (index: 0 | 1 | 2 | 3, x: number, y: number) => void;
    resetGrid: () => void;
    clearPoints: () => void;
    randomPoints: (count?: number) => void;
    setTool: (tool: ActiveTool) => void;
    setPointer: (pointer: { x: number; y: number } | null) => void;
    setGridPopoverOpen: (open: boolean) => void;
    setPoseModalOpen: (open: boolean) => void;
}

export function useDelaunayVoronoi(): DelaunayVoronoiState {
    const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

    const allPoints = useMemo(() => {
        const base = state.layers.grid
            ? [...state.points, ...projectGridPoints(state.grid)]
            : state.points;
        return base.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }, [state.points, state.grid, state.layers.grid]);

    const delaunay = useMemo(() => {
        if (allPoints.length < 3) return null;
        return Delaunay.from(allPoints, (p) => p.x, (p) => p.y);
    }, [allPoints]);

    const voronoi = useMemo(() => {
        if (!delaunay) return null;
        return delaunay.voronoi([0, 0, W, H]);
    }, [delaunay]);

    const triangles = useMemo((): TriangleInfo[] => {
        if (!delaunay) return [];
        const result: TriangleInfo[] = [];
        const t = delaunay.triangles;
        for (let i = 0; i < t.length; i += 3) {
            result.push({ ai: t[i], bi: t[i + 1], ci: t[i + 2] });
        }
        return result;
    }, [delaunay]);

    const stats = useMemo((): Stats => {
        if (!delaunay || triangles.length === 0) {
            return { points: allPoints.length, triangles: 0, edges: 0, minAngleDeg: 0 };
        }
        const edgeSet = new Set<string>();
        let minAngle = Infinity;
        for (const { ai, bi, ci } of triangles) {
            const a = allPoints[ai], b = allPoints[bi], c = allPoints[ci];
            const minRad = triangleMinAngle(a, b, c);
            if (Number.isFinite(minRad) && minRad > 0 && minRad < minAngle) minAngle = minRad;
            for (const [u, v] of [[ai, bi], [bi, ci], [ci, ai]] as [number, number][]) {
                edgeSet.add(u < v ? `${u}-${v}` : `${v}-${u}`);
            }
        }
        return {
            points: allPoints.length,
            triangles: triangles.length,
            edges: edgeSet.size,
            minAngleDeg: minAngle === Infinity ? 0 : (minAngle * 180) / Math.PI,
        };
    }, [allPoints, delaunay, triangles]);

    // Always compute pose from corners; mark invalid when grid layer is off.
    // Source-frame aspect = cols / rows so a frontal grid yields ~0 reproj error.
    const rawPose = usePoseFromHomography(state.grid.corners, W, H, state.grid.cols / state.grid.rows);
    const effectivePose: Pose = state.layers.grid ? rawPose : { ...rawPose, valid: false };

    return {
        state,
        allPoints,
        delaunay,
        voronoi,
        triangles,
        stats,
        pose: effectivePose,
        addPoint: (x, y) => dispatch({ type: "ADD_POINT", x, y }),
        movePoint: (id, x, y) => dispatch({ type: "MOVE_POINT", id, x, y }),
        removePoint: (id) => dispatch({ type: "REMOVE_POINT", id }),
        selectPoint: (id) => dispatch({ type: "SELECT_POINT", id }),
        setHover: (hover) => dispatch({ type: "SET_HOVER", hover }),
        toggleLayer: (layer) => dispatch({ type: "TOGGLE_LAYER", layer }),
        setGridDims: (rows, cols) => dispatch({ type: "SET_GRID_DIMS", rows, cols }),
        moveCorner: (index, x, y) => dispatch({ type: "MOVE_CORNER", index, x, y }),
        resetGrid: () => dispatch({ type: "RESET_GRID" }),
        clearPoints: () => dispatch({ type: "CLEAR_POINTS" }),
        randomPoints: (count = 30) => dispatch({ type: "RANDOM_POINTS", count }),
        setTool: (tool) => dispatch({ type: "SET_TOOL", tool }),
        setPointer: (pointer) => dispatch({ type: "SET_POINTER", pointer }),
        setGridPopoverOpen: (open) => dispatch({ type: "SET_GRID_POPOVER_OPEN", open }),
        setPoseModalOpen: (open) => dispatch({ type: "SET_POSE_MODAL_OPEN", open }),
    };
}
