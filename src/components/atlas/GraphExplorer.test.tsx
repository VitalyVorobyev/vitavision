import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import GraphExplorer from "./GraphExplorer";

// vi.mock("@clerk/clerk-react", ...) is unnecessary here — nothing under
// GraphExplorer gates on auth (unlike NarrativePage). See NarrativePage.test.tsx
// for the pattern this file borrows the jsdom stubs from.

beforeAll(() => {
    // jsdom implements neither; the pan/zoom viewport (useViewport) needs both.
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

function renderExplorer(focusSlug: string) {
    return render(
        <MemoryRouter>
            <GraphExplorer focusSlug={focusSlug} />
        </MemoryRouter>,
    );
}

describe("GraphExplorer (desktop canvas)", () => {
    it("renders the focused entry as the center card", () => {
        renderExplorer("fpn");
        expect(
            screen.getByRole("link", { name: "Open Feature Pyramid Network (FPN)" }),
        ).toBeInTheDocument();
    });

    it("recenters on a neighbor card click, then returns via Ctrl+[", () => {
        renderExplorer("fpn");

        // "fpn" feeds_into "mask-rcnn" — its neighbor card sits on the east lane.
        const neighbor = screen.getByRole("button", { name: /Mask R-CNN/ });
        fireEvent.click(neighbor);

        expect(
            screen.getByRole("link", { name: "Open Mask R-CNN" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("link", { name: "Open Feature Pyramid Network (FPN)" }),
        ).toBeNull();

        fireEvent.keyDown(window, { key: "[", ctrlKey: true });

        expect(
            screen.getByRole("link", { name: "Open Feature Pyramid Network (FPN)" }),
        ).toBeInTheDocument();
    });
});
