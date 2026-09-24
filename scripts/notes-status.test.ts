import { describe, it, expect } from "vitest";
import { buildNoteStatus, noteVersion } from "./notes-status.ts";

describe("noteVersion", () => {
    it("is v2 when the note has a Stated relations section", () => {
        expect(noteVersion("# Core idea\n\n# Stated relations\n\n| a |")).toBe("v2");
    });

    it("is v1 without one, even if the phrase appears in prose", () => {
        expect(noteVersion("# Core idea\n\nNo # Stated relations here.\n## Stated relations")).toBe("v1");
    });
});

describe("buildNoteStatus", () => {
    it("sums citing-page degrees and ranks v1 first by degree", () => {
        const rows = buildNoteStatus(
            [
                { noteId: "a2020-x", version: "v2" },
                { noteId: "b2020-y", version: "v1" },
                { noteId: "c2020-z", version: "v1" },
            ],
            new Map([
                ["page-a", "a2020-x"],
                ["page-b1", "b2020-y"],
                ["page-b2", "b2020-y"],
                ["page-c", "c2020-z"],
            ]),
            new Map([
                ["page-a", 50],
                ["page-b1", 2],
                ["page-b2", 3],
                ["page-c", 9],
            ]),
        );
        expect(rows.map((r) => [r.noteId, r.degree])).toEqual([
            ["c2020-z", 9],
            ["b2020-y", 5],
            ["a2020-x", 50],
        ]);
        expect(rows[1].pages).toEqual(["page-b1", "page-b2"]);
    });

    it("keeps notes that no page cites, with degree 0", () => {
        const rows = buildNoteStatus([{ noteId: "orphan", version: "v1" }], new Map(), new Map());
        expect(rows).toEqual([{ noteId: "orphan", version: "v1", pages: [], degree: 0 }]);
    });
});
