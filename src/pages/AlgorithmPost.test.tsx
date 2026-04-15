import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AlgorithmPost from "./AlgorithmPost";

describe("AlgorithmPost", () => {
    it("loads generated algorithm html and structured data on the client", async () => {
        render(
            <HelmetProvider>
                <MemoryRouter initialEntries={["/algorithms/harris-corner-detector"]}>
                    <Routes>
                        <Route path="/algorithms/:slug" element={<AlgorithmPost />} />
                    </Routes>
                </MemoryRouter>
            </HelmetProvider>,
        );

        expect(
            screen.getByRole("heading", { name: "Harris Corner Detector" }),
        ).toBeInTheDocument();

        expect(
            await screen.findByText(/intensity varies strongly in two independent directions/i),
        ).toBeInTheDocument();
        expect(screen.getByText("Vitaly Vorobyev")).toBeInTheDocument();
        expect(screen.getByText("2026-04-15")).toBeInTheDocument();

        const jsonLd = document.querySelector('script[type="application/ld+json"]');
        expect(jsonLd?.textContent).toContain('"@type":"TechArticle"');
        expect(jsonLd?.textContent).toContain('"headline":"Harris Corner Detector"');
    });

});
