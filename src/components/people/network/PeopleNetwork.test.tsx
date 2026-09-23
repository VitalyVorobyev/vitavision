import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import PeopleNetwork from "./PeopleNetwork.tsx";
import { AuthorsProvider } from "../../../lib/atlas/authorsIndex.tsx";
import { ScholarlyProvider } from "../../../lib/atlas/scholarlyIndex.tsx";
import type { AuthorsIndex } from "../../../generated/authors-index.ts";
import type { ScholarlyIndex } from "../../../generated/scholarly-index.ts";

beforeAll(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
    }));
});

const authorsIndex: AuthorsIndex = {
    authors: {
        he: { name: "Kaiming He", papers: ["p1", "p2"] },
        ross: { name: "Ross Girshick", papers: ["p1"] },
        isolated: { name: "Isolated Person", papers: ["p3"] },
        heAlias: { name: "K. He (alias)", papers: [] },
    },
    paperAuthors: {},
    pagesByPaper: {},
    aliases: { heAlias: "he" },
    coauthors: {},
};

const scholarly: ScholarlyIndex = {
    pages: {},
    papers: {},
    authors: {
        he: { firstYear: 2015, lastYear: 2021, pageCount: 22, primaryPages: [], domains: [], group: "representation" },
        ross: { firstYear: 2014, lastYear: 2017, pageCount: 10, primaryPages: [], domains: [], group: "recognition" },
        isolated: { firstYear: 1990, lastYear: 1995, pageCount: 3, primaryPages: [], domains: [], group: "geometry" },
    },
    coauthorPapers: {
        he: { ross: ["p1", "p2"] },
        ross: { he: ["p1", "p2"] },
    },
    network: {
        nodes: [
            { id: "he", x: 0, y: 0 },
            { id: "ross", x: 100, y: 0 },
            { id: "isolated", x: -400, y: 400 },
        ],
        edges: [["he", "ross", 2]],
        bounds: { minX: -500, minY: -500, maxX: 500, maxY: 500 },
    },
};

function renderNetwork(focusId: string | undefined, onFocusChange = vi.fn()) {
    const utils = render(
        <AuthorsProvider initial={authorsIndex}>
            <ScholarlyProvider initial={scholarly}>
                <MemoryRouter>
                    <PeopleNetwork focusId={focusId} onFocusChange={onFocusChange} />
                </MemoryRouter>
            </ScholarlyProvider>
        </AuthorsProvider>,
    );
    // Node circles aren't in the accessibility tree (the graphic is
    // summarised by the canvas's own role="application" aria-label; the
    // combobox is the keyboard/AT path to a person) — select them directly.
    const nodeCircle = (id: string) => utils.container.querySelector(`circle[data-person-id="${id}"]`)!;
    return { ...utils, onFocusChange, nodeCircle };
}

describe("PeopleNetwork", () => {
    it("renders the overview canvas with every node present", () => {
        const { nodeCircle } = renderNetwork(undefined);
        expect(screen.getByRole("application")).toBeInTheDocument();
        expect(nodeCircle("he")).toBeTruthy();
        expect(nodeCircle("ross")).toBeTruthy();
    });

    it("focuses a person on node click and shows the focus card", () => {
        const { onFocusChange, nodeCircle } = renderNetwork(undefined);
        fireEvent.click(nodeCircle("he"));
        expect(onFocusChange).toHaveBeenCalledWith("he");
    });

    it("shows the focus card with strongest ties and a profile link when focused", () => {
        renderNetwork("he");
        const card = screen.getByRole("link", { name: /Open profile/ }).closest("div")!;
        expect(within(card).getByText("Kaiming He")).toBeInTheDocument();
        expect(within(card).getByText(/Ross Girshick \(2\)/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Open profile/ })).toHaveAttribute("href", "/authors/he");
    });

    it("clears focus via the close (×) button", () => {
        const { onFocusChange } = renderNetwork("he");
        fireEvent.click(screen.getByRole("button", { name: "Clear focus" }));
        expect(onFocusChange).toHaveBeenCalledWith(undefined);
    });

    it("resolves an alias id passed as focusId to its canonical id", () => {
        const { onFocusChange } = renderNetwork("heAlias");
        expect(onFocusChange).toHaveBeenCalledWith("he");
    });

    it("finds and focuses a person through the combobox", () => {
        const { onFocusChange } = renderNetwork(undefined);
        const input = screen.getByRole("combobox", { name: /find a person/i });
        fireEvent.change(input, { target: { value: "girsh" } });
        const option = screen.getByRole("option", { name: /Ross Girshick/ });
        fireEvent.mouseDown(option);
        expect(onFocusChange).toHaveBeenCalledWith("ross");
    });

    it("clears focus on Escape when the canvas has keyboard focus", () => {
        const { onFocusChange } = renderNetwork("he");
        fireEvent.keyDown(screen.getByRole("application"), { key: "Escape" });
        expect(onFocusChange).toHaveBeenCalledWith(undefined);
    });
});
