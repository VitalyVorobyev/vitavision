import { describe, it, expect } from "vitest";
import { parseSourceRef, primaryPaperId, normalizeSourceId } from "./source-ref.ts";

describe("parseSourceRef", () => {
    it("parses a paper: ref", () => {
        expect(parseSourceRef("paper:zhang2000")).toEqual({ kind: "paper", key: "paper:zhang2000" });
    });

    it("treats a bare id as a paper ref", () => {
        expect(parseSourceRef("zhang2000")).toEqual({ kind: "paper", key: "paper:zhang2000" });
    });

    it("parses a repo: ref", () => {
        const ref = "repo:https://github.com/foo/bar@abc1234";
        expect(parseSourceRef(ref)).toEqual({ kind: "repo", key: ref });
    });

    it("parses a doc: ref", () => {
        const ref = "doc:docs/some-note.md";
        expect(parseSourceRef(ref)).toEqual({ kind: "doc", key: ref });
    });
});

describe("primaryPaperId", () => {
    it("returns undefined for undefined input", () => {
        expect(primaryPaperId(undefined)).toBeUndefined();
    });

    it("strips a paper: prefix", () => {
        expect(primaryPaperId("paper:zhang2000")).toBe("zhang2000");
    });

    it("passes a bare id through unchanged", () => {
        expect(primaryPaperId("zhang2000")).toBe("zhang2000");
    });

    it("returns undefined for a repo: ref", () => {
        expect(primaryPaperId("repo:https://github.com/foo/bar@abc1234")).toBeUndefined();
    });

    it("returns undefined for a doc: ref", () => {
        expect(primaryPaperId("doc:docs/some-note.md")).toBeUndefined();
    });
});

describe("normalizeSourceId", () => {
    it("passes a bare id through unchanged", () => {
        expect(normalizeSourceId("zhang2000")).toBe("zhang2000");
    });

    it("strips a paper: prefix", () => {
        expect(normalizeSourceId("paper:zhang2000")).toBe("zhang2000");
    });

    it("ignores repo: refs", () => {
        expect(normalizeSourceId("repo:https://github.com/foo/bar@abc1234")).toBeUndefined();
    });

    it("ignores doc: refs", () => {
        expect(normalizeSourceId("doc:docs/some-note.md")).toBeUndefined();
    });
});
