import { describe, it, expect, vi, afterEach } from "vitest";
import { mergeAuthorIdentities, parseArgs } from "./papers-backfill-authors.ts";
import type { AuthorRecord } from "./authors-build.ts";

describe("mergeAuthorIdentities", () => {
    it("appends an incoming id not already on file", () => {
        const existing: AuthorRecord[] = [{ id: "A1", name: "Zhengyou Zhang" }];
        const incoming = new Map([["A2", { name: "Roger Tsai" }]]);
        const merged = mergeAuthorIdentities(existing, incoming);
        // Sorted by name: "Roger Tsai" < "Zhengyou Zhang".
        expect(merged).toEqual([
            { id: "A2", name: "Roger Tsai" },
            { id: "A1", name: "Zhengyou Zhang" },
        ]);
    });

    it("keeps the existing name/orcid when the same id resolves again", () => {
        const existing: AuthorRecord[] = [{ id: "A1", name: "Corrected Name", orcid: "0000-0001-0000-0001" }];
        const incoming = new Map([["A1", { name: "Stale OpenAlex Name" }]]);
        const merged = mergeAuthorIdentities(existing, incoming);
        expect(merged).toEqual([{ id: "A1", name: "Corrected Name", orcid: "0000-0001-0000-0001" }]);
    });

    it("preserves mergedInto on an existing row untouched by the incoming batch", () => {
        const existing: AuthorRecord[] = [{ id: "A-old", name: "Old", mergedInto: "A-canon" }];
        const merged = mergeAuthorIdentities(existing, new Map());
        expect(merged).toEqual([{ id: "A-old", name: "Old", mergedInto: "A-canon" }]);
    });

    it("sorts the merged result by name", () => {
        const existing: AuthorRecord[] = [{ id: "A1", name: "Zed" }];
        const incoming = new Map([["A2", { name: "Alice" }]]);
        const merged = mergeAuthorIdentities(existing, incoming);
        expect(merged.map((r) => r.id)).toEqual(["A2", "A1"]);
    });

    it("carries orcid through for a newly appended identity", () => {
        const incoming = new Map([["A9", { name: "New Author", orcid: "0000-0001-0000-0009" }]]);
        const merged = mergeAuthorIdentities([], incoming);
        expect(merged).toEqual([{ id: "A9", name: "New Author", orcid: "0000-0001-0000-0009" }]);
    });
});

describe("parseArgs", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("parses --dry-run with no --only", () => {
        expect(parseArgs(["--dry-run"])).toEqual({ mode: "dry-run", only: undefined });
    });

    it("parses --write", () => {
        expect(parseArgs(["--write"])).toEqual({ mode: "write", only: undefined });
    });

    it("parses --only <paper-id> alongside a mode flag", () => {
        expect(parseArgs(["--dry-run", "--only", "zhang2000"])).toEqual({
            mode: "dry-run",
            only: "zhang2000",
        });
    });

    it("parses --only before the mode flag too", () => {
        expect(parseArgs(["--only", "tsai1987", "--write"])).toEqual({
            mode: "write",
            only: "tsai1987",
        });
    });

    it("exits when neither --dry-run nor --write is given", () => {
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
        vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        parseArgs([]);
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("exits when --only is given without a value", () => {
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
        vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        parseArgs(["--dry-run", "--only"]);
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
