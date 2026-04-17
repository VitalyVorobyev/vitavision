import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AlgorithmPost from "./AlgorithmPost";

vi.mock("@clerk/clerk-react", () => ({
    useAuth: () => ({ isLoaded: true, isSignedIn: true }),
    useUser: () => ({ isLoaded: true, user: { publicMetadata: { role: "admin" } } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SignInButton: ({ children }: { children: any }) => <>{children}</>,
}));

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
