import { describe, expect, it } from "vitest";
import {
    authorNarrativesUnion,
    authorSeoDescription,
    buildAuthorPaperRows,
    buildAuthorSummary,
    buildCoAuthorRows,
    buildTimelineEntries,
    computeAuthorTimelineLayout,
    groupContributionByDomain,
} from "./authorView.ts";
import type { ScholarlyAuthor, ScholarlyPageMeta, ScholarlyPaper } from "./scholarlyTypes.ts";
import type { PapersById } from "../../generated/papers-index.ts";

const author: ScholarlyAuthor = {
    firstYear: 2015,
    lastYear: 2021,
    pageCount: 3,
    primaryPages: ["resnet", "mask-rcnn"],
    domains: [
        { domain: "features", count: 2 },
        { domain: "segmentation", count: 1 },
    ],
    group: "representation",
};

const papers: PapersById = {
    p1: { id: "p1", title: "Deep Residual Learning for Image Recognition", authors: ["He", "Zhang"], year: 2016, venue: "CVPR", url: "https://x" },
    p2: { id: "p2", title: "Mask R-CNN", authors: ["He", "Gkioxari"], year: 2017, venue: "ICCV", url: "https://x" },
    p3: { id: "p3", title: "Group Normalization", authors: ["Wu", "He"], year: 2018, venue: "ECCV", url: "https://x" },
    p4: { id: "p4", title: "Focal Loss: for Dense Object Detection", authors: ["Lin"], year: 2017, venue: "ICCV", url: "https://x" },
};

const scholarlyPapers: Record<string, ScholarlyPaper> = {
    p1: { primaryPages: ["resnet"], citingPages: ["fpn"], cites: [], citedBy: [], narratives: [{ slug: "n1", title: "Narrative One", via: "page" }] },
    p2: { primaryPages: ["mask-rcnn"], citingPages: [], cites: [], citedBy: [], narratives: [{ slug: "n2", title: "Narrative Two", via: "page" }] },
    p3: { primaryPages: [], citingPages: ["fpn"], cites: [], citedBy: [], narratives: [] },
    p4: { primaryPages: [], citingPages: [], cites: [], citedBy: [], narratives: [] },
};

const pages: Record<string, ScholarlyPageMeta> = {
    resnet: { title: "ResNet", kind: "model", domain: "features" },
    "mask-rcnn": { title: "Mask R-CNN", kind: "model", domain: "segmentation" },
    fpn: { title: "Feature Pyramid Network (FPN)", kind: "model", domain: "detection" },
};

describe("buildAuthorSummary", () => {
    it("renders both sentences with every clause when all counts are nonzero", () => {
        const s = buildAuthorSummary(author, 4, 2);
        expect(s.first).toBe("4 papers in the Atlas registry, 2015–2021.");
        expect(s.second).not.toBeNull();
        expect(s.second!.bold).toBe("3 Atlas pages");
        expect(s.second!.before + s.second!.bold + s.second!.after).toBe(
            "Their work underpins 3 Atlas pages across 2 domains, is the primary source of 2, and runs through 2 narratives.",
        );
    });

    it("uses singular forms for count-1 fields", () => {
        const one: ScholarlyAuthor = { ...author, pageCount: 1, primaryPages: ["resnet"], domains: [{ domain: "features", count: 1 }] };
        const s = buildAuthorSummary(one, 1, 1);
        expect(s.first).toBe("1 paper in the Atlas registry, 2015–2021.");
        expect(s.second!.bold).toBe("1 Atlas page");
        expect(s.second!.before + s.second!.bold + s.second!.after).toBe(
            "Their work underpins 1 Atlas page across 1 domain, is the primary source of 1, and runs through 1 narrative.",
        );
    });

    it("collapses to a single year when first and last year match", () => {
        const s = buildAuthorSummary({ ...author, firstYear: 1988, lastYear: 1988 }, 1, 0);
        expect(s.first).toBe("1 paper in the Atlas registry, 1988.");
    });

    it("omits the domains clause when there are none, and joins with 'and' for two clauses", () => {
        const s = buildAuthorSummary({ ...author, domains: [] }, 4, 0);
        expect(s.second!.before + s.second!.bold + s.second!.after).toBe(
            "Their work underpins 3 Atlas pages and is the primary source of 2.",
        );
    });

    it("omits the second sentence entirely when pageCount is 0", () => {
        const s = buildAuthorSummary({ ...author, pageCount: 0, primaryPages: [], domains: [] }, 1, 0);
        expect(s.second).toBeNull();
    });

    it("omits the year clause and second sentence when the author isn't in the scholarly index yet", () => {
        const s = buildAuthorSummary(undefined, 1, 0);
        expect(s.first).toBe("1 paper in the Atlas registry.");
        expect(s.second).toBeNull();
    });
});

describe("groupContributionByDomain", () => {
    it("marks primary pages first within a group and groups by domain, largest group first", () => {
        const groups = groupContributionByDomain(["p1", "p3"], scholarlyPapers, pages);
        // p1 -> resnet (primary, features), fpn (reference, detection)
        // p3 -> fpn (reference, detection) -- already present, stays reference
        expect(groups.map((g) => g.domain)).toEqual(["detection", "features"]);
        const features = groups.find((g) => g.domain === "features")!;
        expect(features.entries).toEqual([{ slug: "resnet", title: "ResNet", kind: "model", isPrimary: true }]);
    });

    it("promotes a page to primary if any paper makes it primary, even if seen as reference-only first", () => {
        const spWithBothOrders: Record<string, ScholarlyPaper> = {
            a: { primaryPages: [], citingPages: ["resnet"], cites: [], citedBy: [], narratives: [] },
            b: { primaryPages: ["resnet"], citingPages: [], cites: [], citedBy: [], narratives: [] },
        };
        const groups = groupContributionByDomain(["a", "b"], spWithBothOrders, pages);
        expect(groups[0].entries[0].isPrimary).toBe(true);
    });
});

describe("authorNarrativesUnion", () => {
    it("dedupes narratives across papers and sorts by title", () => {
        const union = authorNarrativesUnion(["p1", "p2"], scholarlyPapers);
        expect(union.map((n) => n.title)).toEqual(["Narrative One", "Narrative Two"]);
    });

    it("returns an empty array when no paper reaches a narrative", () => {
        expect(authorNarrativesUnion(["p3", "p4"], scholarlyPapers)).toEqual([]);
    });
});

describe("buildAuthorPaperRows", () => {
    it("sorts newest first and computes total page counts", () => {
        const rows = buildAuthorPaperRows(["p1", "p2", "p3", "p4"], papers, scholarlyPapers, pages);
        // p2 and p4 both 2017; alphabetical tiebreak: "Focal Loss…" (p4) < "Mask R-CNN" (p2).
        expect(rows.map((r) => r.id)).toEqual(["p3", "p4", "p2", "p1"]);
        // p3 (2018): no primary tag, cited by fpn -> pageCount 1
        expect(rows[0]).toMatchObject({ id: "p3", primaryTags: [], pageCount: 1 });
        // p1 (2016): primary of resnet + cited by fpn -> pageCount 2
        const p1Row = rows.find((r) => r.id === "p1")!;
        expect(p1Row.primaryTags).toEqual([{ slug: "resnet", title: "ResNet" }]);
        expect(p1Row.pageCount).toBe(2);
        // p4: not resolvable to any page
        const p4Row = rows.find((r) => r.id === "p4")!;
        expect(p4Row.primaryTags).toEqual([]);
        expect(p4Row.pageCount).toBe(0);
    });

    it("skips paper ids missing from PapersById", () => {
        const rows = buildAuthorPaperRows(["unknown", "p1"], papers, scholarlyPapers, pages);
        expect(rows.map((r) => r.id)).toEqual(["p1"]);
    });
});

describe("buildTimelineEntries", () => {
    it("labels a primary paper with its Atlas page title and marks state 'primary'", () => {
        const entries = buildTimelineEntries(["p1"], papers, scholarlyPapers, pages);
        expect(entries[0]).toMatchObject({ id: "p1", year: 2016, label: "ResNet", state: "primary" });
    });

    it("labels a reference-only paper with its truncated own title and marks state 'cited'", () => {
        const entries = buildTimelineEntries(["p3"], papers, scholarlyPapers, pages);
        expect(entries[0]).toMatchObject({ label: "Group Normalization", state: "cited" });
    });

    it("marks an uncited paper as state 'none' and truncates before the first colon", () => {
        const entries = buildTimelineEntries(["p4"], papers, scholarlyPapers, pages);
        expect(entries[0]).toMatchObject({ label: "Focal Loss", state: "none" });
    });

    it("sorts oldest first", () => {
        const entries = buildTimelineEntries(["p3", "p1", "p2"], papers, scholarlyPapers, pages);
        expect(entries.map((e) => e.id)).toEqual(["p1", "p2", "p3"]);
    });
});

describe("computeAuthorTimelineLayout", () => {
    it("returns an empty, finite layout for no entries", () => {
        const layout = computeAuthorTimelineLayout([], 700);
        expect(layout.points).toEqual([]);
        expect(Number.isFinite(layout.height)).toBe(true);
        expect(Number.isFinite(layout.axisY)).toBe(true);
    });

    it("places a single entry on the axis at the layout's midpoint x", () => {
        const layout = computeAuthorTimelineLayout([{ id: "a", year: 2016, label: "A", state: "primary" }], 700);
        expect(layout.points).toHaveLength(1);
        expect(layout.points[0].y).toBe(layout.axisY);
        expect(layout.points[0].x).toBeCloseTo((layout.axisX1 + layout.axisX2) / 2);
    });

    it("stacks same-year labels upward without collision and nudges dots apart on x", () => {
        const entries = [
            { id: "a", year: 2017, label: "A", state: "primary" as const },
            { id: "b", year: 2017, label: "B", state: "primary" as const },
        ];
        const layout = computeAuthorTimelineLayout(entries, 700);
        const [a, b] = layout.points;
        expect(a.y).toBe(b.y); // both dots sit on the axis
        expect(a.x).not.toBe(b.x); // nudged apart so each stays clickable
        expect(a.labelY).not.toBe(b.labelY);
        expect(Math.abs(a.labelY - b.labelY)).toBeGreaterThanOrEqual(20);
    });

    it("keeps ticks spanning every year from min to max", () => {
        const entries = [
            { id: "a", year: 2015, label: "A", state: "primary" as const },
            { id: "b", year: 2018, label: "B", state: "primary" as const },
        ];
        const layout = computeAuthorTimelineLayout(entries, 700);
        expect(layout.ticks.map((t) => t.year)).toEqual([2015, 2016, 2017, 2018]);
    });
});

describe("buildCoAuthorRows", () => {
    it("resolves shared paper ids to titles/years, newest first", () => {
        const rows = buildCoAuthorRows(
            [{ id: "A2", name: "Jian Sun", shared: 2, sharedPaperIds: ["p1", "p2"] }],
            papers,
        );
        expect(rows[0].sharedPapers.map((p) => p.id)).toEqual(["p2", "p1"]);
    });

    it("drops shared paper ids unknown to PapersById", () => {
        const rows = buildCoAuthorRows([{ id: "A2", name: "Jian Sun", shared: 1, sharedPaperIds: ["unknown"] }], papers);
        expect(rows[0].sharedPapers).toEqual([]);
    });
});

describe("authorSeoDescription", () => {
    it("pluralizes papers and pages independently", () => {
        expect(authorSeoDescription("Kaiming He", 9, 22)).toBe(
            "Kaiming He — 9 papers underpinning 22 pages of the VitaVision computer vision atlas.",
        );
        expect(authorSeoDescription("Chris Harris", 1, 1)).toBe(
            "Chris Harris — 1 paper underpinning 1 page of the VitaVision computer vision atlas.",
        );
    });
});
