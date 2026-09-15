import { describe, it, expect } from "vitest";
import { findAuthorDupes } from "./authors-dupes.ts";
import type { AuthorRecord } from "./authors-build.ts";

describe("findAuthorDupes", () => {
    it("flags two ids sharing the same ORCID", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "Alexander Kirillov", orcid: "0000-0001-1111-1111" },
            { id: "A2", name: "Alex Kirillov", orcid: "0000-0001-1111-1111" },
        ];
        // Same ORCID AND same surname+first-initial — both rules independently fire.
        const dupes = findAuthorDupes(records, []);
        const orcidRow = dupes.find((d) => /same ORCID/.test(d.reason));
        expect(orcidRow?.ids).toEqual(["A1", "A2"]);
    });

    it("does not flag a single id per ORCID", () => {
        const records: AuthorRecord[] = [{ id: "A1", name: "Solo Author", orcid: "0000-0001-2222-2222" }];
        expect(findAuthorDupes(records, [])).toEqual([]);
    });

    it("flags same surname + first initial across different ids", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "Zhengyou Zhang" },
            { id: "A2", name: "Zheng Zhang" },
        ];
        const dupes = findAuthorDupes(records, []);
        expect(dupes).toHaveLength(1);
        expect(dupes[0].ids).toEqual(["A1", "A2"]);
        expect(dupes[0].reason).toMatch(/surname \+ first initial/);
    });

    it("ignores a middle initial when comparing surname + first initial", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "Jian X. Sun" },
            { id: "A2", name: "Jian Sun" },
        ];
        const dupes = findAuthorDupes(records, []);
        expect(dupes).toHaveLength(1);
        expect(dupes[0].ids).toEqual(["A1", "A2"]);
    });

    it("does not flag different surnames or different first initials", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "Jian Sun" },
            { id: "A2", name: "Kevin Sun" },
            { id: "A3", name: "Jian Zhao" },
        ];
        expect(findAuthorDupes(records, [])).toEqual([]);
    });

    it("flags an initials-only display name", () => {
        const records: AuthorRecord[] = [{ id: "A1", name: "A. Martinelli" }];
        const dupes = findAuthorDupes(records, []);
        expect(dupes).toHaveLength(1);
        expect(dupes[0].reason).toMatch(/initials-only/);
    });

    it("skips a pair already resolved via mergedInto", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "Zhengyou Zhang", mergedInto: "A2" },
            { id: "A2", name: "Zheng Zhang" },
        ];
        expect(findAuthorDupes(records, [])).toEqual([]);
    });

    it("skips an initials-only name that is itself already merged away", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "A. Martinelli", mergedInto: "A2" },
            { id: "A2", name: "Agostino Martinelli" },
        ];
        const dupes = findAuthorDupes(records, []);
        expect(dupes.find((d) => d.ids.includes("A1") && /initials-only/.test(d.reason))).toBeUndefined();
    });

    it("includes each id's paper list in the row", () => {
        const records: AuthorRecord[] = [
            { id: "A1", name: "Alexander Kirillov", orcid: "0000-0001-1111-1111" },
            { id: "A2", name: "Alex Kirillov", orcid: "0000-0001-1111-1111" },
        ];
        const paperAuthorIds = [
            { paperId: "maskrcnn", authorIds: ["A1"] },
            { paperId: "panoptic", authorIds: ["A2"] },
        ];
        const dupes = findAuthorDupes(records, paperAuthorIds);
        expect(dupes[0].papers).toEqual({ A1: ["maskrcnn"], A2: ["panoptic"] });
    });
});
