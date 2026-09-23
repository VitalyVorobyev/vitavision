import { describe, it, expect } from "vitest";
import { buildAliasResolver } from "./authors.ts";
import type { AuthorRecord } from "./authors.ts";

describe("buildAliasResolver", () => {
    it("resolves an id with no mergedInto to itself", () => {
        const records: AuthorRecord[] = [{ id: "A1", name: "Someone" }];
        const { resolve, aliases } = buildAliasResolver(records);
        expect(resolve("A1")).toBe("A1");
        expect(aliases).toEqual({});
    });

    it("resolves a direct alias to its mergedInto target", () => {
        const records: AuthorRecord[] = [
            { id: "A-old", name: "Old", mergedInto: "A-canon" },
            { id: "A-canon", name: "Canonical" },
        ];
        const { resolve, aliases } = buildAliasResolver(records);
        expect(resolve("A-old")).toBe("A-canon");
        expect(aliases).toEqual({ "A-old": "A-canon" });
    });

    it("flattens a chain of aliases to the final canonical id", () => {
        const records: AuthorRecord[] = [
            { id: "A-a", name: "A", mergedInto: "A-b" },
            { id: "A-b", name: "B", mergedInto: "A-c" },
            { id: "A-c", name: "C" },
        ];
        const { resolve, aliases } = buildAliasResolver(records);
        expect(resolve("A-a")).toBe("A-c");
        expect(resolve("A-b")).toBe("A-c");
        expect(aliases).toEqual({ "A-a": "A-c", "A-b": "A-c" });
    });

    it("resolves a cycle to its lexicographically smallest id, stably for every member", () => {
        const records: AuthorRecord[] = [
            { id: "A-x", name: "X", mergedInto: "A-y" },
            { id: "A-y", name: "Y", mergedInto: "A-x" },
        ];
        const { resolve, aliases } = buildAliasResolver(records);
        // Cycle {A-x, A-y}: smallest id "A-x" is the canonical landing point.
        expect(resolve("A-x")).toBe("A-x");
        expect(resolve("A-y")).toBe("A-x");
        expect(aliases).toEqual({ "A-y": "A-x" });
    });

    it("resolves a 3-member cycle regardless of entry point", () => {
        const records: AuthorRecord[] = [
            { id: "B", name: "B", mergedInto: "C" },
            { id: "C", name: "C", mergedInto: "A" },
            { id: "A", name: "A", mergedInto: "B" },
        ];
        const { resolve } = buildAliasResolver(records);
        expect(resolve("A")).toBe("A");
        expect(resolve("B")).toBe("A");
        expect(resolve("C")).toBe("A");
    });

    it("caches results across repeated resolve calls (idempotent)", () => {
        const records: AuthorRecord[] = [{ id: "A-old", name: "Old", mergedInto: "A-canon" }];
        const { resolve } = buildAliasResolver(records);
        expect(resolve("A-old")).toBe("A-canon");
        expect(resolve("A-old")).toBe("A-canon");
    });
});
