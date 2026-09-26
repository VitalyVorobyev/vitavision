import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AtlasPeopleView from "./AtlasPeopleView.tsx";

function renderView(query: string, setQuery: (q: string) => void) {
    return render(
        <HelmetProvider>
            <MemoryRouter>
                <AtlasPeopleView
                    isDesktop={true}
                    view="people"
                    setView={() => {}}
                    mode="directory"
                    setMode={() => {}}
                    personId={undefined}
                    setPersonFocus={() => {}}
                    query={query}
                    setQuery={setQuery}
                />
            </MemoryRouter>
        </HelmetProvider>,
    );
}

describe("AtlasPeopleView search box", () => {
    it("initializes the search box from the `q`-backed query prop", () => {
        renderView("girshick", () => {});
        expect(screen.getByRole("searchbox", { name: "Search people" })).toHaveValue("girshick");
    });

    it("calls setQuery (the shared `q` param setter) as the reader types", () => {
        const setQuery = vi.fn();
        renderView("", setQuery);
        fireEvent.change(screen.getByRole("searchbox", { name: "Search people" }), {
            target: { value: "jegou" },
        });
        expect(setQuery).toHaveBeenCalledWith("jegou");
    });
});
