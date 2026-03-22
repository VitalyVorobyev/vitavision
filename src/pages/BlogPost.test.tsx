import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BlogPost from "./BlogPost";

describe("BlogPost", () => {
    it("loads generated post html on the client for a slug route", async () => {
        render(
            <HelmetProvider>
                <MemoryRouter initialEntries={["/blog/00-intro"]}>
                    <Routes>
                        <Route path="/blog/:slug" element={<BlogPost />} />
                    </Routes>
                </MemoryRouter>
            </HelmetProvider>,
        );

        expect(
            screen.getByRole("heading", { name: "Introducing Vitavision" }),
        ).toBeInTheDocument();

        expect(
            await screen.findByText(/Vitavision is a place for practical computer vision/i),
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Post content failed to load."),
        ).not.toBeInTheDocument();
    });
});
