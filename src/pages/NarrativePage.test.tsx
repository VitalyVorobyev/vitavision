import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import NarrativePage from "./NarrativePage";

// The only narrative on disk is the draft fixture, so the reader must be an
// admin for the page to render at all — same gate every other atlas kind uses.
vi.mock("@clerk/clerk-react", () => ({
    useAuth: () => ({ isLoaded: true, isSignedIn: true }),
    useUser: () => ({ isLoaded: true, user: { publicMetadata: { role: "admin" } } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SignInButton: ({ children }: { children: any }) => <>{children}</>,
}));

beforeAll(() => {
    // jsdom implements neither; the canvas viewport needs both.
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

function renderAt(url: string) {
    return render(
        <HelmetProvider>
            <MemoryRouter initialEntries={[url]}>
                <Routes>
                    <Route path="/atlas/narratives/:slug" element={<NarrativePage />} />
                </Routes>
            </MemoryRouter>
        </HelmetProvider>,
    );
}

describe("NarrativePage", () => {
    it("renders the header, the constellation, and the full essay", async () => {
        renderAt("/atlas/narratives/example-draft");

        expect(
            screen.getByRole("heading", { name: /Example Narrative \(draft fixture\)/ }),
        ).toBeInTheDocument();
        expect(screen.getByText("4 stops · 2 chapters")).toBeInTheDocument();

        // Node chips come from the async narrative module.
        expect(await screen.findByRole("button", { name: /ViT/ })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /ChESS corner detection/ })).toBeInTheDocument();

        // Walkthrough starts collapsed; the full essay renders below the canvas.
        expect(screen.getByRole("button", { name: "Start the walkthrough" })).toBeInTheDocument();
        expect(
            screen.getByText(/minimal draft fixture for the narrative content kind/i),
        ).toBeInTheDocument();
    });

    it("shows the step's chapter and dims unfocused nodes when ?step= is set", async () => {
        renderAt("/atlas/narratives/example-draft?step=2");

        expect(await screen.findByText("Step 2/2")).toBeInTheDocument();
        // The step's chapter slice is repeated in the rail alongside the full essay below.
        expect(screen.getAllByText(/DINOv2 keeps the ViT backbone/)).toHaveLength(2);

        // `attn` is not in step 2's focus, so its chip is dimmed.
        const chip = (id: string) =>
            document.querySelector<HTMLElement>(`[data-narrative-node="${id}"]`);
        expect(chip("attn")?.style.opacity).toBe("0.26");
        expect(chip("vit-node")?.style.opacity).toBe("1");
    });

    it("opens the inspector for the node named in ?node=", async () => {
        renderAt("/atlas/narratives/example-draft?node=chess-paper");

        expect(await screen.findByRole("link", { name: /Read the paper/ })).toBeInTheDocument();
        expect(screen.getByText("S. Bennett & J. Lasenby")).toBeInTheDocument();
    });

    it("renders NotFound for an unknown slug", () => {
        renderAt("/atlas/narratives/does-not-exist");
        expect(screen.queryByText(/Example Narrative/)).toBeNull();
    });
});
