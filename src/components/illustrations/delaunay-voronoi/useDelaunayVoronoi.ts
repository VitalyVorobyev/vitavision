import { useReducer, useMemo, useCallback } from "react";
import { Delaunay } from "d3-delaunay";
import { v4 as uuid } from "uuid";
import { computeHomography, applyHomography } from "./homography";
import { triangleMinAngle, triangleArea } from "./geometry";
import type { Point, GridConfig, Layers, ViewState, HoverTarget, ActiveTool, HistorySnapshot } from "./types";

const HISTORY_LIMIT = 50;

function snapshotOf(state: ViewState): HistorySnapshot {
    return {
        points: state.points,
        corners: state.grid.corners,
        overrides: state.grid.overrides,
        deleted: state.grid.deleted,
    };
}

function pushHistory(state: ViewState, dragTag: string | null = null): ViewState["history"] {
    // Drag coalescing: if the new drag tag matches the existing one, fold this change
    // into the existing first snapshot of the drag (do not push a new entry).
    if (dragTag !== null && state.dragTag === dragTag) {
        return state.history;
    }
    const past = [...state.history.past, snapshotOf(state)];
    if (past.length > HISTORY_LIMIT) past.shift();
    return { past, future: [] };
}

function applySnapshot(state: ViewState, snap: HistorySnapshot): ViewState {
    return {
        ...state,
        points: snap.points,
        grid: {
            ...state.grid,
            corners: snap.corners,
            overrides: snap.overrides,
            deleted: snap.deleted,
        },
        selectedId: null,
        hover: null,
        dragTag: null,
    };
}

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
            overrides: {},
            deleted: [],
        },
        layers: { delaunay: true, voronoi: false, circumcircles: false, grid: false },
        selectedId: null,
        hover: null,
        activeTool: "add",
        pointer: null,
        gridPopoverOpen: false,
        history: { past: [], future: [] },
        dragTag: null,
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
    | { type: "END_DRAG" }
    | { type: "UNDO" }
    | { type: "REDO" };

function reducer(state: ViewState, action: Action): ViewState {
    switch (action.type) {
        case "ADD_POINT":
            return {
                ...state,
                points: [...state.points, { id: uuid(), x: action.x, y: action.y, kind: "free" }],
                selectedId: null,
                history: pushHistory(state),
                dragTag: null,
            };
        case "MOVE_POINT": {
            const dragTag = `move:${action.id}`;
            const inPoints = state.points.some((p) => p.id === action.id);
            if (inPoints) {
                return {
                    ...state,
                    points: state.points.map((p) =>
                        p.id === action.id ? { ...p, x: action.x, y: action.y } : p,
                    ),
                    history: pushHistory(state, dragTag),
                    dragTag,
                };
            }
            const cornerIdx = state.grid.corners.findIndex((c) => c.id === action.id);
            if (cornerIdx >= 0) {
                const newCorners = state.grid.corners.map((c, i) =>
                    i === cornerIdx ? { ...c, x: action.x, y: action.y } : c,
                ) as [Point, Point, Point, Point];
                return {
                    ...state,
                    grid: { ...state.grid, corners: newCorners },
                    history: pushHistory(state, dragTag),
                    dragTag,
                };
            }
            // Grid node — record an override so the user's drag survives re-projection.
            if (action.id.startsWith("g-")) {
                return {
                    ...state,
                    grid: {
                        ...state.grid,
                        overrides: { ...state.grid.overrides, [action.id]: { x: action.x, y: action.y } },
                    },
                    history: pushHistory(state, dragTag),
                    dragTag,
                };
            }
            return state;
        }
        case "REMOVE_POINT": {
            // Free point — drop it.
            if (state.points.some((p) => p.id === action.id)) {
                return {
                    ...state,
                    points: state.points.filter((p) => p.id !== action.id),
                    selectedId: state.selectedId === action.id ? null : state.selectedId,
                    history: pushHistory(state),
                    dragTag: null,
                };
            }
            // Grid node — record it as deleted, also clear any override.
            if (action.id.startsWith("g-")) {
                const { [action.id]: _dropped, ...overrides } = state.grid.overrides;
                void _dropped;
                const deleted = state.grid.deleted.includes(action.id)
                    ? state.grid.deleted
                    : [...state.grid.deleted, action.id];
                return {
                    ...state,
                    grid: { ...state.grid, overrides, deleted },
                    selectedId: state.selectedId === action.id ? null : state.selectedId,
                    history: pushHistory(state),
                    dragTag: null,
                };
            }
            return state;
        }
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
            const dragTag = `corner:${action.index}`;
            const newCorners = state.grid.corners.map((c, i) =>
                i === action.index ? { ...c, x: action.x, y: action.y } : c,
            ) as [Point, Point, Point, Point];
            return {
                ...state,
                grid: { ...state.grid, corners: newCorners },
                history: pushHistory(state, dragTag),
                dragTag,
            };
        }
        case "RESET_GRID":
            return {
                ...state,
                grid: { ...state.grid, corners: defaultCorners(), overrides: {}, deleted: [] },
                history: pushHistory(state),
                dragTag: null,
            };
        case "CLEAR_POINTS":
            return {
                ...state,
                points: [],
                selectedId: null,
                hover: null,
                history: pushHistory(state),
                dragTag: null,
            };
        case "RANDOM_POINTS": {
            // Hard cap to prevent oversized allocations from any caller (pasted input,
            // upstream callers, or unsanitized keyboard shortcuts). 2000 is well past the
            // demo's useful range; anything larger only hurts the browser tab.
            const count = Math.max(0, Math.min(2000, Math.floor(action.count) || 0));
            const padding = 40;
            const newPoints: Point[] = Array.from({ length: count }, () => ({
                id: uuid(),
                x: padding + Math.random() * (W - 2 * padding),
                y: padding + Math.random() * (H - 2 * padding),
                kind: "free" as const,
            }));
            return {
                ...state,
                points: newPoints,
                selectedId: null,
                history: pushHistory(state),
                dragTag: null,
            };
        }
        case "SET_TOOL": {
            // Re-activating grid while popover is open → close popover (tool stays active).
            if (action.tool === "grid" && state.activeTool === "grid" && state.gridPopoverOpen) {
                return { ...state, gridPopoverOpen: false };
            }
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
        case "END_DRAG":
            return state.dragTag === null ? state : { ...state, dragTag: null };
        case "UNDO": {
            if (state.history.past.length === 0) return state;
            const prev = state.history.past[state.history.past.length - 1];
            const past = state.history.past.slice(0, -1);
            const future = [snapshotOf(state), ...state.history.future];
            return { ...applySnapshot(state, prev), history: { past, future } };
        }
        case "REDO": {
            if (state.history.future.length === 0) return state;
            const next = state.history.future[0];
            const future = state.history.future.slice(1);
            const past = [...state.history.past, snapshotOf(state)];
            return { ...applySnapshot(state, next), history: { past, future } };
        }
        default:
            return state;
    }
}

function projectGridPoints(grid: GridConfig): Point[] {
    const H_mat = computeHomography(grid.corners);
    // Singular corner configuration (collinear or coincident) — skip projection entirely.
    // The user can drag a corner back to a valid quad to restore the grid; meanwhile the
    // four corner handles remain interactive (they're rendered separately).
    if (H_mat === null) {
        // Honour overrides anyway — they're explicit user-placed positions.
        const deletedSet = new Set(grid.deleted);
        return Object.entries(grid.overrides)
            .filter(([id]) => !deletedSet.has(id))
            .map(([id, pos]) => ({ id, x: pos.x, y: pos.y, kind: "grid" as const }));
    }
    const deletedSet = new Set(grid.deleted);
    const pts: Point[] = [];
    for (let r = 0; r <= grid.rows; r++) {
        for (let c = 0; c <= grid.cols; c++) {
            const id = `g-${r}-${c}`;
            if (deletedSet.has(id)) continue;
            const override = grid.overrides[id];
            const pos = override ?? applyHomography(H_mat, { x: c / grid.cols, y: r / grid.rows });
            pts.push({ id, x: pos.x, y: pos.y, kind: "grid" });
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
    endDrag: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useDelaunayVoronoi(): DelaunayVoronoiState {
    const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

    const allPoints = useMemo(() => {
        const base = state.layers.grid
            ? [...state.points, ...projectGridPoints(state.grid)]
            : state.points;
        // Dedupe within ~1e-3 px tolerance — corners coincide with g-0-0/g-0-cols/g-rows-cols/g-rows-0
        // by construction, and overrides can land on existing grid nodes. Coincident points
        // confuse Delaunay and produce phantom slivers in stats.
        const seen = new Map<string, Point>();
        for (const p of base) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
            const key = `${Math.round(p.x * 1e3)}_${Math.round(p.y * 1e3)}`;
            if (!seen.has(key)) seen.set(key, p);
        }
        return [...seen.values()];
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
        // Filter Delaunator hull artifacts: when input has collinear subsets that aren't
        // axis-aligned (which is every projective grid edge after a corner drag), Delaunator
        // emits degenerate "triangles" with effectively zero area. They contaminate the
        // min-angle stat. 1e-3 px² is well below any meaningful triangulation cell and
        // matches the dedup tolerance used for input points.
        const TRIANGLE_AREA_EPS = 1e-3;
        for (let i = 0; i < t.length; i += 3) {
            const ai = t[i], bi = t[i + 1], ci = t[i + 2];
            const a = allPoints[ai], b = allPoints[bi], c = allPoints[ci];
            if (triangleArea(a, b, c) <= TRIANGLE_AREA_EPS) continue;
            result.push({ ai, bi, ci });
        }
        return result;
    }, [delaunay, allPoints]);

    const stats = useMemo((): Stats => {
        if (!delaunay || triangles.length === 0) {
            return { points: allPoints.length, triangles: 0, edges: 0, minAngleDeg: 0 };
        }
        const edgeSet = new Set<string>();
        let minAngle = Infinity;
        for (const { ai, bi, ci } of triangles) {
            const a = allPoints[ai], b = allPoints[bi], c = allPoints[ci];
            const minRad = triangleMinAngle(a, b, c);
            if (Number.isFinite(minRad) && minRad < minAngle) minAngle = minRad;
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

    const addPoint = useCallback((x: number, y: number) => dispatch({ type: "ADD_POINT", x, y }), []);
    const movePoint = useCallback((id: string, x: number, y: number) => dispatch({ type: "MOVE_POINT", id, x, y }), []);
    const removePoint = useCallback((id: string) => dispatch({ type: "REMOVE_POINT", id }), []);
    const selectPoint = useCallback((id: string | null) => dispatch({ type: "SELECT_POINT", id }), []);
    const setHover = useCallback((hover: HoverTarget | null) => dispatch({ type: "SET_HOVER", hover }), []);
    const toggleLayer = useCallback((layer: keyof Layers) => dispatch({ type: "TOGGLE_LAYER", layer }), []);
    const setGridDims = useCallback((rows?: number, cols?: number) => dispatch({ type: "SET_GRID_DIMS", rows, cols }), []);
    const moveCorner = useCallback((index: 0 | 1 | 2 | 3, x: number, y: number) => dispatch({ type: "MOVE_CORNER", index, x, y }), []);
    const resetGrid = useCallback(() => dispatch({ type: "RESET_GRID" }), []);
    const clearPoints = useCallback(() => dispatch({ type: "CLEAR_POINTS" }), []);
    const randomPoints = useCallback((count = 30) => dispatch({ type: "RANDOM_POINTS", count }), []);
    const setTool = useCallback((tool: ActiveTool) => dispatch({ type: "SET_TOOL", tool }), []);
    const setPointer = useCallback((pointer: { x: number; y: number } | null) => dispatch({ type: "SET_POINTER", pointer }), []);
    const setGridPopoverOpen = useCallback((open: boolean) => dispatch({ type: "SET_GRID_POPOVER_OPEN", open }), []);
    const endDrag = useCallback(() => dispatch({ type: "END_DRAG" }), []);
    const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
    const redo = useCallback(() => dispatch({ type: "REDO" }), []);

    return {
        state,
        allPoints,
        delaunay,
        voronoi,
        triangles,
        stats,
        addPoint,
        movePoint,
        removePoint,
        selectPoint,
        setHover,
        toggleLayer,
        setGridDims,
        moveCorner,
        resetGrid,
        clearPoints,
        randomPoints,
        setTool,
        setPointer,
        setGridPopoverOpen,
        endDrag,
        undo,
        redo,
        canUndo: state.history.past.length > 0,
        canRedo: state.history.future.length > 0,
    };
}
