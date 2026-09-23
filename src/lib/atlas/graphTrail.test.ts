import { describe, expect, it } from "vitest";
import { initialTrailState, trailReducer, type TrailState } from "./graphTrail";

// Real, known-valid slugs (also used in graphNeighbors.test.ts) — the reducer's
// navigate() guard checks membership in the real content graph.
const A = "chess-corners";
const B = "ccdn-checkerboard-detector";
const C = "fpn";

describe("trailReducer — back", () => {
    it("is a no-op when history is empty", () => {
        const state = initialTrailState(A);
        expect(trailReducer(state, { type: "back" })).toBe(state);
    });

    it("pops the last history entry onto current, and current onto future", () => {
        const state: TrailState = { history: [A], current: B, future: [] };
        expect(trailReducer(state, { type: "back" })).toEqual({
            history: [],
            current: A,
            future:  [B],
        });
    });
});

describe("trailReducer — forward", () => {
    it("is a no-op when future is empty", () => {
        const state = initialTrailState(A);
        expect(trailReducer(state, { type: "forward" })).toBe(state);
    });

    it("shifts the first future entry onto current, and current onto history", () => {
        const state: TrailState = { history: [], current: A, future: [B] };
        expect(trailReducer(state, { type: "forward" })).toEqual({
            history: [A],
            current: B,
            future:  [],
        });
    });
});

describe("trailReducer — navigate", () => {
    it("is a no-op for an unknown slug", () => {
        const state = initialTrailState(A);
        expect(trailReducer(state, { type: "navigate", slug: "does-not-exist" })).toBe(state);
    });

    it("is a no-op when navigating to the already-current slug", () => {
        const state = initialTrailState(A);
        expect(trailReducer(state, { type: "navigate", slug: A })).toBe(state);
    });

    it("pushes current onto history and clears future for a fresh slug", () => {
        const state: TrailState = { history: [], current: A, future: [C] };
        expect(trailReducer(state, { type: "navigate", slug: B })).toEqual({
            history: [A],
            current: B,
            future:  [],
        });
    });

    it("smart-backs when the target is the immediate-previous history entry", () => {
        const state: TrailState = { history: [A], current: B, future: [] };
        const viaNavigate = trailReducer(state, { type: "navigate", slug: A });
        const viaBack      = trailReducer(state, { type: "back" });
        expect(viaNavigate).toEqual(viaBack);
    });

    it("smart-forwards when the target is the next redo entry", () => {
        const state: TrailState = { history: [], current: A, future: [B] };
        const viaNavigate = trailReducer(state, { type: "navigate", slug: B });
        const viaForward   = trailReducer(state, { type: "forward" });
        expect(viaNavigate).toEqual(viaForward);
    });
});

describe("trailReducer — jump", () => {
    it("jumps to a middle history entry, folding the rest into future", () => {
        // history: [A, B], current: C — jump to index 0 (A)
        const state: TrailState = { history: [A, B], current: C, future: [] };
        expect(trailReducer(state, { type: "jump", index: 0 })).toEqual({
            history: [],
            current: A,
            future:  [B, C],
        });
    });

    it("preserves an existing future when jumping backward", () => {
        const state: TrailState = { history: [A, B], current: C, future: ["extra"] };
        expect(trailReducer(state, { type: "jump", index: 1 })).toEqual({
            history: [A],
            current: B,
            future:  [C, "extra"],
        });
    });
});
