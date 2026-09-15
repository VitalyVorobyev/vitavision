import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CoauthorEgoGraph } from "./CoauthorEgoGraph.tsx";
import type { CoAuthor } from "../../lib/atlas/authorStats.ts";

function makeCoAuthors(n: number): CoAuthor[] {
    return Array.from({ length: n }, (_, i) => ({
        id: `A${i}`,
        name: `Collaborator ${i}`,
        shared: i + 1,
        sharedPages: [],
    }));
}

function renderGraph(coAuthors: CoAuthor[]) {
    return render(
        <MemoryRouter initialEntries={["/authors/subject"]}>
            <Routes>
                <Route
                    path="/authors/subject"
                    element={<CoauthorEgoGraph subjectName="Subject Author" coAuthors={coAuthors} />}
                />
                <Route path="/authors/:id" element={<div>author page</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("CoauthorEgoGraph", () => {
    it("renders the subject node and one node per collaborator", () => {
        renderGraph(makeCoAuthors(3));
        expect(screen.getByRole("img", { name: /Co-author graph for Subject Author/ })).toBeInTheDocument();
        expect(screen.getByText("Author")).toBeInTheDocument(); // "Subject Author" -> surname "Author"
        for (let i = 0; i < 3; i++) {
            expect(screen.getByRole("link", { name: `Collaborator ${i}` })).toBeInTheDocument();
        }
    });

    it("truncates to 12 collaborators and shows a +N more label", () => {
        renderGraph(makeCoAuthors(15));
        expect(screen.getAllByRole("link")).toHaveLength(12);
        expect(screen.getByText("+3 more")).toBeInTheDocument();
    });

    it("gives higher-shared-count edges a thicker stroke", () => {
        const { container } = renderGraph(makeCoAuthors(3));
        const lines = container.querySelectorAll("line");
        const widths = [...lines].map((l) => Number(l.getAttribute("stroke-width")));
        // shared counts are 1, 2, 3 in order — stroke width must be non-decreasing.
        expect(widths[0]).toBeLessThanOrEqual(widths[1]);
        expect(widths[1]).toBeLessThanOrEqual(widths[2]);
        expect(widths[2]).toBeGreaterThan(widths[0]);
    });

    it("navigates to the collaborator's author page on click", () => {
        renderGraph(makeCoAuthors(2));
        fireEvent.click(screen.getByRole("link", { name: "Collaborator 0" }));
        expect(screen.getByText("author page")).toBeInTheDocument();
    });

    it("navigates on Enter key activation", () => {
        renderGraph(makeCoAuthors(2));
        fireEvent.keyDown(screen.getByRole("link", { name: "Collaborator 1" }), { key: "Enter" });
        expect(screen.getByText("author page")).toBeInTheDocument();
    });

    it("renders nothing when there are no collaborators", () => {
        const { container } = renderGraph([]);
        expect(container).toBeEmptyDOMElement();
    });
});
