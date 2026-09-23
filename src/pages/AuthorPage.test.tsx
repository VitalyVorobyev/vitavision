import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AuthorPage from "./AuthorPage.tsx";
import { PapersProvider } from "../lib/atlas/papersIndex.tsx";
import { AuthorsProvider } from "../lib/atlas/authorsIndex.tsx";
import { ScholarlyProvider } from "../lib/atlas/scholarlyIndex.tsx";
import type { PapersById } from "../generated/papers-index.ts";
import type { AuthorsIndex } from "../generated/authors-index.ts";
import type { ScholarlyIndex } from "../generated/scholarly-index.ts";

beforeAll(() => {
    // Desktop layout by default; individual tests override via window.matchMedia stubs where needed.
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
    }));
});

const papers: PapersById = {
    resnet2016: { id: "resnet2016", title: "Deep Residual Learning for Image Recognition", authors: ["K. He", "J. Sun"], year: 2016, venue: "CVPR", url: "https://x" },
    maskrcnn2017: { id: "maskrcnn2017", title: "Mask R-CNN", authors: ["K. He", "G. Gkioxari"], year: 2017, venue: "ICCV", url: "https://x" },
    groupnorm2018: { id: "groupnorm2018", title: "Group Normalization", authors: ["Y. Wu", "K. He"], year: 2018, venue: "ECCV", url: "https://x" },
    ghostpaper: { id: "ghostpaper", title: "An Uncited Workshop Paper", authors: ["G. Host"], year: 2021, venue: "Workshop", url: "https://x" },
};

const authorsIndex: AuthorsIndex = {
    authors: {
        he: { name: "Kaiming He", orcid: "0000-0001-2345-6789", papers: ["resnet2016", "maskrcnn2017", "groupnorm2018"] },
        sun: { name: "Jian Sun", papers: ["resnet2016"] },
        ghost: { name: "Ghost Host", papers: ["ghostpaper"] },
    },
    paperAuthors: {
        resnet2016: ["he", "sun"],
        maskrcnn2017: ["he"],
        groupnorm2018: ["he"],
        ghostpaper: ["ghost"],
    },
    pagesByPaper: { resnet2016: ["resnet"], maskrcnn2017: ["mask-rcnn"] },
    aliases: { "old-he-id": "he" },
    coauthors: { he: { sun: 1 }, sun: { he: 1 } },
};

const scholarly: ScholarlyIndex = {
    pages: {
        resnet: { title: "ResNet", kind: "model", domain: "features" },
        "mask-rcnn": { title: "Mask R-CNN", kind: "model", domain: "segmentation" },
    },
    papers: {
        resnet2016: {
            primaryPages: ["resnet"],
            citingPages: [],
            cites: [],
            citedBy: [],
            narratives: [{ slug: "n1", title: "Where Did the Inductive Bias Go?", via: "page" }],
        },
        maskrcnn2017: { primaryPages: ["mask-rcnn"], citingPages: [], cites: [], citedBy: [], narratives: [] },
        groupnorm2018: { primaryPages: [], citingPages: ["mask-rcnn"], cites: [], citedBy: [], narratives: [] },
    },
    authors: {
        he: {
            firstYear: 2016,
            lastYear: 2018,
            pageCount: 2,
            primaryPages: ["mask-rcnn", "resnet"],
            domains: [
                { domain: "features", count: 1 },
                { domain: "segmentation", count: 1 },
            ],
            group: "representation",
        },
        sun: { firstYear: 2016, lastYear: 2016, pageCount: 1, primaryPages: ["resnet"], domains: [{ domain: "features", count: 1 }], group: "features" },
        ghost: { firstYear: 2021, lastYear: 2021, pageCount: 0, primaryPages: [], domains: [], group: "other" },
    },
    coauthorPapers: { he: { sun: ["resnet2016"] }, sun: { he: ["resnet2016"] } },
    network: { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
};

function renderAt(url: string) {
    return render(
        <HelmetProvider>
            <PapersProvider initial={papers}>
                <AuthorsProvider initial={authorsIndex}>
                    <ScholarlyProvider initial={scholarly}>
                        <MemoryRouter initialEntries={[url]}>
                            <Routes>
                                <Route path="/authors/:id" element={<AuthorPage />} />
                            </Routes>
                        </MemoryRouter>
                    </ScholarlyProvider>
                </AuthorsProvider>
            </PapersProvider>
        </HelmetProvider>,
    );
}

describe("AuthorPage", () => {
    it("renders the name, ORCID/OpenAlex links, and the two-sentence summary", () => {
        renderAt("/authors/he");

        expect(screen.getByRole("heading", { name: "Kaiming He" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /ORCID/ })).toHaveAttribute(
            "href",
            "https://orcid.org/0000-0001-2345-6789",
        );
        expect(screen.getByRole("link", { name: /OpenAlex/ })).toHaveAttribute("href", "https://openalex.org/he");

        expect(screen.getByText(/3 papers in the Atlas registry, 2016–2018\./)).toBeInTheDocument();
        expect(screen.getByText("2 Atlas pages")).toBeInTheDocument();
    });

    it("groups contribution chips by domain and links them to the atlas page", () => {
        renderAt("/authors/he");

        expect(screen.getByRole("link", { name: "ResNet" })).toHaveAttribute("href", "/atlas/resnet");
        // Mask R-CNN appears both as a contribution chip and a papers-table tag.
        expect(screen.getAllByRole("link", { name: "Mask R-CNN" })[0]).toHaveAttribute("href", "/atlas/mask-rcnn");
    });

    it("renders the narratives list", () => {
        renderAt("/authors/he");
        expect(screen.getByRole("link", { name: /Where Did the Inductive Bias Go\?/ })).toHaveAttribute(
            "href",
            "/atlas/narratives/n1",
        );
    });

    it("renders the papers table newest first with page tags", () => {
        renderAt("/authors/he");
        const table = within(screen.getByTestId("author-papers-table"));
        const paperLinks = table.getAllByRole("link");
        expect(paperLinks.map((a) => a.getAttribute("href"))).toEqual([
            "/papers/groupnorm2018",
            "/papers/maskrcnn2017",
            "/papers/resnet2016",
        ]);
        expect(table.getByText("No page yet")).toBeInTheDocument();
        expect(table.queryByText("not yet cited")).not.toBeInTheDocument();
    });

    it("renders the co-author list with shared paper titles", () => {
        renderAt("/authors/he");
        const list = within(screen.getByTestId("author-coauthor-list"));
        expect(list.getByRole("link", { name: /Jian Sun/ })).toHaveAttribute("href", "/authors/sun");
        expect(list.getByText("1 shared paper")).toBeInTheDocument();
        expect(list.getByRole("link", { name: /Deep Residual Learning/ })).toHaveAttribute(
            "href",
            "/papers/resnet2016",
        );
    });

    it("redirects a merged alias id to the canonical author", () => {
        renderAt("/authors/old-he-id");
        expect(screen.getByRole("heading", { name: "Kaiming He" })).toBeInTheDocument();
    });

    it("renders NotFound for an unknown author id", () => {
        renderAt("/authors/does-not-exist");
        expect(screen.getByText("404")).toBeInTheDocument();
    });

    it("omits the Atlas-footprint sentence entirely when the author's papers underpin no page yet", () => {
        renderAt("/authors/ghost");
        expect(screen.getByText("1 paper in the Atlas registry, 2021.")).toBeInTheDocument();
        expect(screen.queryByText(/Their work underpins/)).not.toBeInTheDocument();
    });
});
