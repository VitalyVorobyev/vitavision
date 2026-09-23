import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { SearchEntity, SearchEntitiesOptions } from "../../lib/atlas/searchClient.ts";

const searchEntities = vi.fn<(query: string, opts?: SearchEntitiesOptions) => SearchEntity[]>();

vi.mock("../../lib/atlas/searchClient.ts", () => ({
    searchEntities: (query: string, opts?: SearchEntitiesOptions) => searchEntities(query, opts),
}));

const { default: PeoplePapersMatches } = await import("./PeoplePapersMatches.tsx");

const PEOPLE: SearchEntity[] = [
    { type: "author", path: "/authors/A1", title: "Ross Girshick", summary: "5 papers" },
];
const PAPERS: SearchEntity[] = [
    {
        type: "paper",
        path: "/papers/he2016-resnet",
        title: "Deep Residual Learning for Image Recognition",
        summary: "CVPR 2016",
        authors: ["K. He", "X. Zhang"],
        venue: "CVPR 2016",
    },
];

function mockResults(people: SearchEntity[], papers: SearchEntity[]) {
    searchEntities.mockImplementation((_query, opts) => {
        const types = opts?.types ?? [];
        if (types.includes("author")) return people;
        if (types.includes("paper")) return papers;
        return [];
    });
}

function renderMatches(query = "resnet") {
    return render(
        <MemoryRouter>
            <PeoplePapersMatches query={query} />
        </MemoryRouter>,
    );
}

describe("PeoplePapersMatches", () => {
    it("renders nothing when there are no people or paper hits", () => {
        mockResults([], []);
        const { container } = renderMatches();
        expect(container).toBeEmptyDOMElement();
    });

    it("renders a person row and a paper row when both have hits", () => {
        mockResults(PEOPLE, PAPERS);
        renderMatches();
        expect(screen.getByText("Ross Girshick")).toBeInTheDocument();
        expect(screen.getByText("5 papers")).toBeInTheDocument();
        expect(screen.getByText("Deep Residual Learning for Image Recognition")).toBeInTheDocument();
        expect(screen.getByText("K. He, X. Zhang · CVPR 2016")).toBeInTheDocument();
    });

    it("links a person row to /authors/<id> and a paper row to /papers/<id>", () => {
        mockResults(PEOPLE, PAPERS);
        renderMatches();
        expect(screen.getByRole("link", { name: /Ross Girshick/ })).toHaveAttribute("href", "/authors/A1");
        expect(screen.getByRole("link", { name: /Deep Residual Learning/ })).toHaveAttribute(
            "href",
            "/papers/he2016-resnet",
        );
    });

    it("links the group headers to the query-scoped People/Papers views", () => {
        mockResults(PEOPLE, PAPERS);
        renderMatches("resnet 2016");
        expect(screen.getByRole("link", { name: "All matching people →" })).toHaveAttribute(
            "href",
            "/atlas?view=people&q=resnet%202016",
        );
        expect(screen.getByRole("link", { name: "All matching papers →" })).toHaveAttribute(
            "href",
            "/atlas?view=papers&q=resnet%202016",
        );
    });

    it("hides the People group when there are no person hits, but still shows Papers", () => {
        mockResults([], PAPERS);
        renderMatches();
        expect(screen.queryByText("People")).not.toBeInTheDocument();
        expect(screen.getByText("Papers")).toBeInTheDocument();
    });

    it("hides the Papers group when there are no paper hits, but still shows People", () => {
        mockResults(PEOPLE, []);
        renderMatches();
        expect(screen.getByText("People")).toBeInTheDocument();
        expect(screen.queryByText("Papers")).not.toBeInTheDocument();
    });
});
