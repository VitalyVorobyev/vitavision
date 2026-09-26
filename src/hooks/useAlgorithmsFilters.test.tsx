import { describe, it, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import useAlgorithmsFilters from "./useAlgorithmsFilters.ts";
import { ATLAS_VIEW_STORAGE_KEY } from "../lib/atlas/atlasFilters.ts";

function wrapper(initial: string) {
    return ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    );
}

function useFiltersWithLocation() {
    return { ...useAlgorithmsFilters(), location: useLocation() };
}

describe("useAlgorithmsFilters", () => {
    beforeEach(() => localStorage.clear());

    it("keeps filters identity stable across re-renders with an unchanged URL", () => {
        const { result, rerender } = renderHook(() => useAlgorithmsFilters(), {
            wrapper: wrapper("/atlas?kind=model"),
        });
        const first = result.current.filters;
        rerender();
        expect(result.current.filters).toBe(first);
    });

    it("switching back to the default view updates filters even though the URL does not change", () => {
        localStorage.setItem(ATLAS_VIEW_STORAGE_KEY, "graph");
        const { result } = renderHook(() => useAlgorithmsFilters(), { wrapper: wrapper("/atlas") });
        expect(result.current.filters.view).toBe("graph");
        act(() => result.current.setView("grid"));
        expect(result.current.filters.view).toBe("grid");
    });

    it("setters preserve ?focus=", () => {
        const { result } = renderHook(() => useFiltersWithLocation(), {
            wrapper: wrapper("/atlas?view=graph&focus=fpn"),
        });
        act(() => result.current.setQuery("pyramid"));
        const params = new URLSearchParams(result.current.location.search);
        expect(params.get("focus")).toBe("fpn");
        expect(params.get("q")).toBe("pyramid");
    });
});
