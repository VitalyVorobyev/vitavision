import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import PaperPage from "./PaperPage.tsx";
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
    "he2016-resnet": {
        id: "he2016-resnet",
        title: "Deep Residual Learning for Image Recognition",
        authors: ["K. He", "X. Zhang"],
        year: 2016,
        venue: "CVPR",
        url: "https://arxiv.org/pdf/1512.03385",
        arxiv: "1512.03385",
    },
    "krizhevsky2012-alexnet": {
        id: "krizhevsky2012-alexnet",
        title: "ImageNet Classification with Deep Convolutional Neural Networks",
        authors: ["A. Krizhevsky", "I. Sutskever", "G. Hinton"],
        year: 2012,
        venue: "NeurIPS",
        url: "https://example.com/alexnet",
    },
    "simonyan2014-vgg": {
        id: "simonyan2014-vgg",
        title: "Very Deep Convolutional Networks",
        authors: ["K. Simonyan", "A. Zisserman"],
        year: 2014,
        venue: "arXiv",
        url: "https://example.com/vgg",
    },
    "he2017-maskrcnn": {
        id: "he2017-maskrcnn",
        title: "Mask R-CNN",
        authors: ["K. He"],
        year: 2017,
        venue: "ICCV",
        url: "https://example.com/maskrcnn",
    },
    ...Object.fromEntries(
        Array.from({ length: 8 }, (_, i) => {
            const id = `citer${2017 + i}-paper${i}`;
            return [
                id,
                {
                    id,
                    title: `A Citing Paper ${i}`,
                    authors: ["B. Author"],
                    year: 2017 + i,
                    venue: "CVPR",
                    url: `https://example.com/${id}`,
                },
            ] as const;
        }),
    ),
};

const citedByIds = Array.from({ length: 8 }, (_, i) => `citer${2017 + i}-paper${i}`);

const authorsIndex: AuthorsIndex = {
    authors: {
        he: { name: "Kaiming He", papers: ["he2016-resnet", "he2017-maskrcnn"] },
        zhang: { name: "Xiangyu Zhang", papers: ["he2016-resnet"] },
    },
    paperAuthors: {
        "he2016-resnet": ["he", "zhang"],
        "he2017-maskrcnn": ["he"],
    },
    pagesByPaper: {},
    aliases: {},
    coauthors: {},
};

const scholarly: ScholarlyIndex = {
    pages: {
        resnet: { title: "ResNet", kind: "model", domain: "features" },
        "alpha-model": { title: "Alpha Model", kind: "model", domain: "detection" },
        "beta-concept": { title: "Beta Concept", kind: "concept", domain: "features" },
    },
    papers: {
        "he2016-resnet": {
            primaryPages: ["resnet"],
            citingPages: ["alpha-model", "beta-concept"],
            cites: ["krizhevsky2012-alexnet", "simonyan2014-vgg"],
            citedBy: citedByIds,
            narratives: [{ slug: "n1", title: "Where Did the Inductive Bias Go?", via: "page" }],
        },
        "krizhevsky2012-alexnet": {
            primaryPages: [],
            citingPages: [],
            cites: [],
            citedBy: ["he2016-resnet"],
            narratives: [],
        },
        "simonyan2014-vgg": { primaryPages: [], citingPages: [], cites: [], citedBy: ["he2016-resnet"], narratives: [] },
        "he2017-maskrcnn": { primaryPages: [], citingPages: [], cites: [], citedBy: [], narratives: [] },
        ...Object.fromEntries(
            citedByIds.map((id) => [
                id,
                { primaryPages: [], citingPages: [], cites: ["he2016-resnet"], citedBy: [], narratives: [] },
            ]),
        ),
    },
    authors: {
        he: { firstYear: 2016, lastYear: 2017, pageCount: 1, primaryPages: ["resnet"], domains: [{ domain: "features", count: 1 }], group: "features" },
        zhang: { firstYear: 2016, lastYear: 2016, pageCount: 1, primaryPages: ["resnet"], domains: [{ domain: "features", count: 1 }], group: "features" },
    },
    coauthorPapers: {},
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
                                <Route path="/papers/:id" element={<PaperPage />} />
                            </Routes>
                        </MemoryRouter>
                    </ScholarlyProvider>
                </AuthorsProvider>
            </PapersProvider>
        </HelmetProvider>,
    );
}

describe("PaperPage", () => {
    it("renders title, author links, and the four-stat strip", () => {
        renderAt("/papers/he2016-resnet");

        expect(
            screen.getByRole("heading", { name: "Deep Residual Learning for Image Recognition" }),
        ).toBeInTheDocument();

        expect(screen.getByRole("link", { name: "Kaiming He" })).toHaveAttribute("href", "/authors/he");
        expect(screen.getByRole("link", { name: "Xiangyu Zhang" })).toHaveAttribute("href", "/authors/zhang");

        expect(screen.getByText("page built on it")).toBeInTheDocument();
        expect(screen.getByText("more pages cite it")).toBeInTheDocument();
        expect(screen.getByText("narrative")).toBeInTheDocument();
        expect(screen.getByText("registry papers cite it")).toBeInTheDocument();
    });

    it("links the primary-source card to the atlas page", () => {
        renderAt("/papers/he2016-resnet");

        const primaryLink = screen.getByRole("link", { name: /Primary source of/ });
        expect(primaryLink).toHaveAttribute("href", "/atlas/resnet");
        expect(screen.getByText("ResNet")).toBeInTheDocument();
    });

    it("renders the narratives grid", () => {
        renderAt("/papers/he2016-resnet");

        const narrativeLink = screen.getByRole("link", { name: /Where Did the Inductive Bias Go\?/ });
        expect(narrativeLink).toHaveAttribute("href", "/atlas/narratives/n1");
    });

    it("shows the first 7 'built upon by' rows and expands the rest on 'Show all'", () => {
        renderAt("/papers/he2016-resnet");

        expect(screen.getByText("A Citing Paper 0")).toBeInTheDocument();
        expect(screen.getByText("A Citing Paper 6")).toBeInTheDocument();
        expect(screen.queryByText("A Citing Paper 7")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Show all 8/ }));

        expect(screen.getByText("A Citing Paper 7")).toBeInTheDocument();
    });

    it("renders the 'builds on' list with a short author list", () => {
        renderAt("/papers/he2016-resnet");

        const link = screen.getByRole("link", { name: /ImageNet Classification with Deep Convolutional Neural Networks/ });
        expect(link).toHaveAttribute("href", "/papers/krizhevsky2012-alexnet");
        expect(screen.getByText("Krizhevsky, Sutskever, Hinton")).toBeInTheDocument();
    });

    it("renders NotFound for an unknown paper id", () => {
        renderAt("/papers/does-not-exist");
        expect(screen.getByText("404")).toBeInTheDocument();
    });
});
