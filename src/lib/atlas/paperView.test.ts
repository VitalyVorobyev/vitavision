import { describe, expect, it } from "vitest";
import {
    computePaperStats,
    firstSentence,
    groupCitingPagesByDomain,
    sameAuthorsPapers,
    shortAuthorList,
} from "./paperView.ts";
import type { ScholarlyPageMeta, ScholarlyPaper } from "./scholarlyTypes.ts";
import type { PapersById } from "../../generated/papers-index.ts";

function paper(overrides: Partial<ScholarlyPaper> = {}): ScholarlyPaper {
    return {
        primaryPages: [],
        citingPages: [],
        cites: [],
        citedBy: [],
        narratives: [],
        ...overrides,
    };
}

describe("computePaperStats", () => {
    it("singularizes each label at count 1 and pluralizes otherwise", () => {
        const stats = computePaperStats(
            paper({
                primaryPages: ["resnet"],
                citingPages: ["fpn"],
                narratives: [{ slug: "n1", title: "N1", via: "page" }],
                citedBy: ["a"],
            }),
        );
        expect(stats).toEqual([
            { value: 1, label: "page built on it" },
            { value: 1, label: "more page cites it" },
            { value: 1, label: "narrative" },
            { value: 1, label: "registry paper cites it" },
        ]);
    });

    it("pluralizes at 0 and >1, and defaults every count to 0 when the paper is undefined", () => {
        const stats = computePaperStats(undefined);
        expect(stats).toEqual([
            { value: 0, label: "pages built on it" },
            { value: 0, label: "more pages cite it" },
            { value: 0, label: "narratives" },
            { value: 0, label: "registry papers cite it" },
        ]);

        const many = computePaperStats(
            paper({
                primaryPages: ["a", "b"],
                citingPages: ["c", "d"],
                citedBy: ["e", "f"],
            }),
        );
        expect(many[0]).toEqual({ value: 2, label: "pages built on it" });
        expect(many[1]).toEqual({ value: 2, label: "more pages cite it" });
        expect(many[3]).toEqual({ value: 2, label: "registry papers cite it" });
    });
});

describe("groupCitingPagesByDomain", () => {
    const pages: Record<string, ScholarlyPageMeta> = {
        bisenet: { title: "BiSeNet", kind: "model", domain: "segmentation" },
        fcn: { title: "FCN: Fully Convolutional Networks", kind: "model", domain: "segmentation" },
        deeplab: { title: "DeepLab", kind: "model", domain: "segmentation" },
        fpn: { title: "Feature Pyramid Network (FPN)", kind: "model", domain: "detection" },
        cnn: { title: "Convolutional Neural Network", kind: "concept", domain: "features" },
        noDomain: { title: "No Domain Page", kind: "concept" },
    };

    it("sorts groups by size descending, then label A–Z, and entries by title", () => {
        const groups = groupCitingPagesByDomain(["fpn", "deeplab", "bisenet", "fcn", "cnn"], pages);
        expect(groups.map((g) => g.domain)).toEqual(["segmentation", "detection", "features"]);
        expect(groups[0].label).toBe("Segmentation");
        expect(groups[0].entries.map((e) => e.title)).toEqual([
            "BiSeNet",
            "DeepLab",
            "FCN: Fully Convolutional Networks",
        ]);
    });

    it("buckets domain-less pages under an 'Other' group and skips unknown slugs", () => {
        const groups = groupCitingPagesByDomain(["noDomain", "ghost-slug"], pages);
        expect(groups).toEqual([
            { domain: "other", label: "Other", entries: [{ slug: "noDomain", title: "No Domain Page", kind: "concept" }] },
        ]);
    });

    it("returns [] for an empty citing list", () => {
        expect(groupCitingPagesByDomain([], pages)).toEqual([]);
    });
});

describe("sameAuthorsPapers", () => {
    const authorsIndex = {
        authors: {
            he: { papers: ["he2016-resnet", "he2017-maskrcnn", "lin2017-fpn", "ren2015-faster"] },
            zhang: { papers: ["he2016-resnet"] },
            ren: { papers: ["he2016-resnet", "ren2015-faster"] },
            sun: { papers: ["he2016-resnet", "ren2015-faster"] },
        },
    };
    const papers: PapersById = {
        "he2016-resnet": { id: "he2016-resnet", title: "Deep Residual Learning", authors: [], year: 2016, venue: "CVPR", url: "u" },
        "he2017-maskrcnn": { id: "he2017-maskrcnn", title: "Mask R-CNN", authors: [], year: 2017, venue: "ICCV", url: "u" },
        "lin2017-fpn": { id: "lin2017-fpn", title: "Feature Pyramid Networks", authors: [], year: 2017, venue: "CVPR", url: "u" },
        "ren2015-faster": { id: "ren2015-faster", title: "Faster R-CNN", authors: [], year: 2015, venue: "NeurIPS", url: "u" },
    };

    it("unions papers across subject authors, excludes the current paper, sorts oldest first", () => {
        const rows = sameAuthorsPapers("he2016-resnet", ["he", "zhang", "ren", "sun"], authorsIndex, papers);
        expect(rows.map((r) => r.id)).toEqual(["ren2015-faster", "lin2017-fpn", "he2017-maskrcnn"]);
    });

    it("lists which subject authors are credited on each row, in subject order", () => {
        const rows = sameAuthorsPapers("he2016-resnet", ["he", "zhang", "ren", "sun"], authorsIndex, papers);
        const faster = rows.find((r) => r.id === "ren2015-faster")!;
        expect(faster.authorIds).toEqual(["he", "ren", "sun"]);
        const maskrcnn = rows.find((r) => r.id === "he2017-maskrcnn")!;
        expect(maskrcnn.authorIds).toEqual(["he"]);
    });

    it("returns [] when no subject author has any other paper", () => {
        const rows = sameAuthorsPapers("he2016-resnet", ["zhang"], authorsIndex, papers);
        expect(rows).toEqual([]);
    });
});

describe("shortAuthorList", () => {
    it("joins up to 3 surnames in full", () => {
        expect(shortAuthorList(["Alex Krizhevsky", "Ilya Sutskever", "Geoffrey Hinton"])).toBe(
            "Krizhevsky, Sutskever, Hinton",
        );
        expect(shortAuthorList(["Karen Simonyan", "Andrew Zisserman"])).toBe("Simonyan, Zisserman");
    });

    it("truncates to the first two surnames plus 'et al.' beyond 3 authors", () => {
        expect(
            shortAuthorList([
                "Christian Szegedy",
                "Wei Liu",
                "Yangqing Jia",
                "Pierre Sermanet",
                "Scott Reed",
            ]),
        ).toBe("Szegedy, Liu et al.");
    });

    it("returns '' for an empty author list", () => {
        expect(shortAuthorList([])).toBe("");
    });
});

describe("firstSentence", () => {
    it("returns the plain first sentence when there is no inline math", () => {
        expect(firstSentence("Detects corners. Uses a response function.")).toBe("Detects corners.");
    });

    it("cuts before inline math and appends a period if the cut text lacks one", () => {
        const summary =
            "Family of very deep CNN image classifiers (18 to 152 layers) built from residual blocks $y = \\mathcal{F}(x) + x$ that reformulate each block.";
        expect(firstSentence(summary)).toBe(
            "Family of very deep CNN image classifiers (18 to 152 layers) built from residual blocks.",
        );
    });

    it("does not add a period when the text before $ already ends in one", () => {
        const summary = "Some sentence. $x = 1$ more math text.";
        expect(firstSentence(summary)).toBe("Some sentence.");
    });

    it("falls back to the whole trimmed scope when no sentence punctuation is found", () => {
        expect(firstSentence("no punctuation here")).toBe("no punctuation here");
    });
});
