import { describe, it, expect, vi } from "vitest";
import { generateId, deepMerge, unwrapMaps, alignmentFromWasm, gridFromWasm, toPoint, toPointOrNull, toPointArray, toPointArrayOrNull, mapTargetBundle } from "../util";
import { lazyInit } from "../modules";

describe("generateId", () => {
    it("produces a v4-shaped UUID string", () => {
        const id = generateId();
        expect(typeof id).toBe("string");
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("produces distinct ids across calls", () => {
        const ids = new Set(Array.from({ length: 20 }, () => generateId()));
        expect(ids.size).toBe(20);
    });
});

describe("deepMerge", () => {
    it("overwrites leaf values from source", () => {
        const out = deepMerge({ a: 1, b: 2 }, { b: 3 });
        expect(out).toEqual({ a: 1, b: 3 });
    });

    it("recurses into nested plain objects without wiping untouched siblings", () => {
        const target = { lattice: { kind: "hex", rows: 5, cols: 6 }, marker: { r: 1 } };
        const source = { lattice: { rows: 9 } };
        const out = deepMerge(target, source);
        expect(out).toEqual({ lattice: { kind: "hex", rows: 9, cols: 6 }, marker: { r: 1 } });
    });

    it("replaces arrays wholesale rather than merging element-wise", () => {
        const out = deepMerge({ xs: [1, 2, 3] }, { xs: [9] });
        expect(out.xs).toEqual([9]);
    });

    it("does not mutate the target object", () => {
        const target = { a: { b: 1 } };
        deepMerge(target, { a: { b: 2 } });
        expect(target.a.b).toBe(1);
    });
});

describe("unwrapMaps", () => {
    it("converts a top-level Map to a plain object", () => {
        const m = new Map<string, unknown>([["a", 1], ["b", 2]]);
        expect(unwrapMaps(m)).toEqual({ a: 1, b: 2 });
    });

    it("recursively converts nested Maps at every level", () => {
        const inner = new Map<string, unknown>([["x", 1]]);
        const outer = new Map<string, unknown>([["cell", inner], ["list", [inner]]]);
        expect(unwrapMaps(outer)).toEqual({ cell: { x: 1 }, list: [{ x: 1 }] });
    });

    it("passes through plain objects, arrays, and primitives unchanged", () => {
        expect(unwrapMaps({ a: 1 })).toEqual({ a: 1 });
        expect(unwrapMaps([1, 2, 3])).toEqual([1, 2, 3]);
        expect(unwrapMaps(null)).toBeNull();
        expect(unwrapMaps(undefined)).toBeUndefined();
        expect(unwrapMaps(5)).toBe(5);
    });
});

describe("alignmentFromWasm", () => {
    it("converts {matrix, translation} into {transform, translation}", () => {
        const out = alignmentFromWasm({ matrix: [[1, 0], [0, 1]], translation: [3, 4] });
        expect(out).toEqual({ transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [3, 4] });
    });

    it("preserves a non-identity (e.g. rotated) matrix", () => {
        const out = alignmentFromWasm({ matrix: [[0, -1], [1, 0]], translation: [0, 0] });
        expect(out.transform).toEqual({ a: 0, b: -1, c: 1, d: 0 });
    });
});

describe("gridFromWasm", () => {
    it("maps {u,v} to {i,j}", () => {
        expect(gridFromWasm({ u: 2, v: 5 })).toEqual({ i: 2, j: 5 });
    });

    it("returns null for a null grid", () => {
        expect(gridFromWasm(null)).toBeNull();
    });
});

describe("point helpers", () => {
    it("toPoint accepts an [x,y] array", () => {
        expect(toPoint([1, 2])).toEqual({ x: 1, y: 2 });
    });

    it("toPoint accepts an {x,y} object", () => {
        expect(toPoint({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
    });

    it("toPointOrNull returns null for null/undefined", () => {
        expect(toPointOrNull(null)).toBeNull();
        expect(toPointOrNull(undefined)).toBeNull();
        expect(toPointOrNull([5, 6])).toEqual({ x: 5, y: 6 });
    });

    it("toPointArray maps every element", () => {
        expect(toPointArray([[1, 2], [3, 4]])).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
    });

    it("toPointArrayOrNull returns null for null/undefined", () => {
        expect(toPointArrayOrNull(null)).toBeNull();
        expect(toPointArrayOrNull([[1, 2]])).toEqual([{ x: 1, y: 2 }]);
    });
});

describe("mapTargetBundle", () => {
    it("maps the library's json_text/svg_text/png_bytes/dxf_text to svg/dxf/json/png", () => {
        const png = new Uint8Array([1, 2, 3]);
        const out = mapTargetBundle({ json_text: "{}", svg_text: "<svg/>", png_bytes: png, dxf_text: "0\nEOF" });
        expect(out).toEqual({ svg: "<svg/>", dxf: "0\nEOF", json: "{}", png });
    });
});

describe("lazyInit", () => {
    interface FakeModule {
        default: () => Promise<void>;
        thing: number;
    }

    it("calls the loader and the module's default() only once across repeated calls", async () => {
        const defaultFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
        const loader = vi.fn<() => Promise<FakeModule>>().mockResolvedValue({ default: defaultFn, thing: 42 });

        const getModule = lazyInit(loader);
        const a = await getModule();
        const b = await getModule();

        expect(loader).toHaveBeenCalledTimes(1);
        expect(defaultFn).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
        expect(a.thing).toBe(42);
    });

    it("caches the in-flight promise for concurrent callers", async () => {
        const loader = vi.fn<() => Promise<FakeModule>>().mockResolvedValue({
            default: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
            thing: 1,
        });
        const getModule = lazyInit(loader);

        const [a, b] = await Promise.all([getModule(), getModule()]);

        expect(loader).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
    });
});
