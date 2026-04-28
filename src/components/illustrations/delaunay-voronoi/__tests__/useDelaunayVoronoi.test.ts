import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDelaunayVoronoi } from "../useDelaunayVoronoi";

describe("useDelaunayVoronoi reducer", () => {
    it("undo restores points after add; redo reapplies", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());

        act(() => result.current.addPoint(100, 100));
        act(() => result.current.addPoint(200, 200));
        expect(result.current.state.points).toHaveLength(2);
        expect(result.current.canUndo).toBe(true);

        act(() => result.current.undo());
        expect(result.current.state.points).toHaveLength(1);

        act(() => result.current.undo());
        expect(result.current.state.points).toHaveLength(0);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);

        act(() => result.current.redo());
        expect(result.current.state.points).toHaveLength(1);
        act(() => result.current.redo());
        expect(result.current.state.points).toHaveLength(2);
    });

    it("coalesces a continuous drag of one point into a single history entry", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());

        act(() => result.current.addPoint(100, 100));
        const id = result.current.state.points[0].id;
        const pastAfterAdd = result.current.state.history.past.length;

        // simulate 30 pointermove dispatches without an endDrag in between
        for (let i = 0; i < 30; i++) {
            act(() => result.current.movePoint(id, 100 + i, 100 + i));
        }
        expect(result.current.state.history.past.length).toBe(pastAfterAdd + 1);

        // a single undo restores to the position before the drag started
        act(() => result.current.undo());
        const p = result.current.state.points[0];
        expect(p.x).toBe(100);
        expect(p.y).toBe(100);
    });

    it("ending a drag and starting a new one creates two history entries", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());
        act(() => result.current.addPoint(100, 100));
        const id = result.current.state.points[0].id;
        const start = result.current.state.history.past.length;

        act(() => result.current.movePoint(id, 110, 110));
        act(() => result.current.movePoint(id, 120, 120));
        act(() => result.current.endDrag());
        act(() => result.current.movePoint(id, 130, 130));
        act(() => result.current.movePoint(id, 140, 140));

        expect(result.current.state.history.past.length).toBe(start + 2);
    });

    it("setTool('grid') opens popover; calling again with popover open closes it", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());

        act(() => result.current.setTool("grid"));
        expect(result.current.state.activeTool).toBe("grid");
        expect(result.current.state.gridPopoverOpen).toBe(true);
        expect(result.current.state.layers.grid).toBe(true);

        act(() => result.current.setTool("grid"));
        expect(result.current.state.activeTool).toBe("grid");
        expect(result.current.state.gridPopoverOpen).toBe(false);

        act(() => result.current.setTool("grid"));
        expect(result.current.state.gridPopoverOpen).toBe(true);
    });

    it("dedupes coincident points fed to Delaunay (corners ≡ g-corner grid nodes)", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());

        // Enable grid layer — projected grid points at the four corners coincide with c0..c3,
        // but corners are NOT in allPoints. The four projected corner positions coincide with
        // four of the unit-square grid nodes (g-0-0, g-0-cols, g-rows-0, g-rows-cols), so
        // dedupe simply guarantees no two points within 1e-3 px.
        act(() => result.current.toggleLayer("grid"));

        const pts = result.current.allPoints;
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x;
                const dy = pts[i].y - pts[j].y;
                expect(dx * dx + dy * dy).toBeGreaterThan(1e-6);
            }
        }
    });

    it("removePoint on a grid id marks it deleted", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());
        act(() => result.current.toggleLayer("grid"));
        const someGrid = result.current.allPoints.find((p) => p.id.startsWith("g-"));
        expect(someGrid).toBeDefined();
        const id = someGrid!.id;
        act(() => result.current.removePoint(id));
        expect(result.current.state.grid.deleted).toContain(id);
    });

    it("history caps at 50 entries", () => {
        const { result } = renderHook(() => useDelaunayVoronoi());
        for (let i = 0; i < 60; i++) {
            act(() => result.current.addPoint(i, i));
        }
        expect(result.current.state.history.past.length).toBe(50);
    });
});
