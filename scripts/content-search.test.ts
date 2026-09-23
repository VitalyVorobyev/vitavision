import { describe, it, expect } from "vitest";
import {
    buildAuthorSearchRecords,
    buildPaperSearchRecords,
    buildSearchRecords,
    paperNicknameTags,
    type AuthorSearchEntry,
    type PaperSearchEntry,
    type SearchEntry,
} from "./content-search.ts";

describe("buildSearchRecords", () => {
    it("builds an atlas-page record with the /atlas/<slug> path", () => {
        const entries: SearchEntry[] = [
            {
                slug: "harris-corner-detector",
                type: "algorithm",
                title: "Harris Corner Detector",
                summary: "Classic corner response.",
                tags: ["corners"],
                html: "<h2>Response function</h2>",
            },
        ];
        const [record] = buildSearchRecords(entries);
        expect(record).toMatchObject({
            slug: "harris-corner-detector",
            path: "/atlas/harris-corner-detector",
            type: "algorithm",
            headings: ["Response function"],
        });
    });

    it("routes a narrative to /atlas/narratives/<slug>", () => {
        const entries: SearchEntry[] = [
            { slug: "forty-years-against-outliers", type: "narrative", title: "T", summary: "S", tags: [], html: "" },
        ];
        expect(buildSearchRecords(entries)[0].path).toBe("/atlas/narratives/forty-years-against-outliers");
    });
});

describe("buildAuthorSearchRecords", () => {
    it("shapes an author record with the /authors/<id> path and a pluralized paper count", () => {
        const authors: AuthorSearchEntry[] = [
            { id: "A5049246408", name: "Ross Girshick", papers: ["girshick2014-rcnn", "girshick2015-fast-rcnn"] },
        ];
        expect(buildAuthorSearchRecords(authors)).toEqual([
            {
                slug: "A5049246408",
                path: "/authors/A5049246408",
                type: "author",
                title: "Ross Girshick",
                summary: "2 papers",
                tags: [],
                headings: [],
            },
        ]);
    });

    it("uses the singular \"1 paper\" for a single-paper author", () => {
        const authors: AuthorSearchEntry[] = [{ id: "A1", name: "Solo Author", papers: ["p1"] }];
        expect(buildAuthorSearchRecords(authors)[0].summary).toBe("1 paper");
    });

    it("does not itself filter merged aliases — callers must pass only canonical authors", () => {
        // Collision-safety/alias-exclusion is enforced upstream by
        // authors-build.ts#buildAuthorsIndex (its `authors` map is already
        // alias-resolved — a merged id never appears as a key there). This
        // builder is a pure per-entry projection and trusts its input.
        const authors: AuthorSearchEntry[] = [{ id: "A-canon", name: "Canonical Person", papers: ["p1"] }];
        const records = buildAuthorSearchRecords(authors);
        expect(records).toHaveLength(1);
        expect(records[0].slug).toBe("A-canon");
    });
});

describe("paperNicknameTags", () => {
    it("extracts the nickname after a simple surname+year token", () => {
        expect(paperNicknameTags("he2016-resnet")).toEqual(["resnet"]);
    });

    it("extracts multiple nickname tokens", () => {
        expect(paperNicknameTags("gao2011-dual-homography")).toEqual(["dual", "homography"]);
    });

    it("handles a hyphenated surname by finding the first token with a digit", () => {
        expect(paperNicknameTags("shi-tomasi1994-features")).toEqual(["features"]);
    });

    it("handles a hyphenated surname with a multi-word nickname", () => {
        expect(paperNicknameTags("longuet-higgins1981-eight-point")).toEqual(["eight", "point"]);
    });

    it("returns [] when no token contains a digit", () => {
        expect(paperNicknameTags("no-year-here")).toEqual([]);
    });

    it("returns [] when the digit token is the last token (no nickname)", () => {
        expect(paperNicknameTags("smith2020")).toEqual([]);
    });
});

describe("buildPaperSearchRecords", () => {
    it("shapes a paper record with the paper:-prefixed slug and /papers/<id> path", () => {
        const papers: PaperSearchEntry[] = [
            {
                id: "he2016-resnet",
                title: "Deep Residual Learning for Image Recognition",
                authors: ["K. He", "X. Zhang", "S. Ren", "J. Sun"],
                venue: "CVPR 2016",
                year: 2016,
            },
        ];
        expect(buildPaperSearchRecords(papers)).toEqual([
            {
                slug: "paper:he2016-resnet",
                path: "/papers/he2016-resnet",
                type: "paper",
                title: "Deep Residual Learning for Image Recognition",
                summary: "CVPR 2016",
                tags: ["resnet"],
                headings: [],
                authors: ["K. He", "X. Zhang", "S. Ren", "J. Sun"],
                venue: "CVPR 2016",
            },
        ]);
    });

    it("does not duplicate the year when venue already ends with it", () => {
        const papers: PaperSearchEntry[] = [
            { id: "oquab2023-dinov2", title: "DINOv2", authors: [], venue: "TMLR 2024 (arXiv 2023)", year: 2023 },
        ];
        expect(buildPaperSearchRecords(papers)[0].summary).toBe("TMLR 2024 (arXiv 2023)");
    });

    it("appends the year when venue is bare", () => {
        const papers: PaperSearchEntry[] = [
            { id: "lowe2004-sift", title: "Distinctive Image Features from Scale-Invariant Keypoints", authors: [], venue: "IJCV", year: 2004 },
        ];
        expect(buildPaperSearchRecords(papers)[0].summary).toBe("IJCV 2004");
    });

    it("omits authors/venue fields when empty", () => {
        const papers: PaperSearchEntry[] = [{ id: "anon2020-nickname", title: "T", authors: [], venue: "", year: 2020 }];
        const [record] = buildPaperSearchRecords(papers);
        expect(record.authors).toBeUndefined();
        expect(record.venue).toBeUndefined();
    });
});
