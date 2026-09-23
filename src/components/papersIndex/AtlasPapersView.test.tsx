import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AtlasPapersView from "./AtlasPapersView.tsx";

function renderView(query: string, setQuery: (q: string) => void) {
    return render(
        <HelmetProvider>
            <MemoryRouter>
                <AtlasPapersView isDesktop={true} view="papers" setView={() => {}} query={query} setQuery={setQuery} />
            </MemoryRouter>
        </HelmetProvider>,
    );
}

describe("AtlasPapersView search box", () => {
    it("initializes the search box from the `q`-backed query prop", () => {
        renderView("resnet", () => {});
        expect(screen.getByPlaceholderText("Search titles, authors, venues")).toHaveValue("resnet");
    });

    it("calls setQuery (the shared `q` param setter) as the reader types", () => {
        const setQuery = vi.fn();
        renderView("", setQuery);
        fireEvent.change(screen.getByPlaceholderText("Search titles, authors, venues"), {
            target: { value: "resnet" },
        });
        expect(setQuery).toHaveBeenCalledWith("resnet");
    });
});
