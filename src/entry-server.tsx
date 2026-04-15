import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/clerk-react";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import AlgorithmIndex from "./pages/AlgorithmIndex.tsx";
import AlgorithmPost from "./pages/AlgorithmPost.tsx";
import DemoIndex from "./pages/DemoIndex.tsx";
import DemoPage from "./pages/DemoPage.tsx";
import Navbar from "./components/layout/Navbar.tsx";
import Footer from "./components/layout/Footer.tsx";
import { StaticContentProvider, type StaticContentContextValue } from "./lib/content/ssr-content.tsx";

// In SSR (postbuild), Vite doesn't substitute import.meta.env — read from process.env instead.
// ClerkProvider is required because Navbar renders <SignedOut>/<SignedIn>.
// In SSR there is no active session, so <SignedOut> renders and <SignedIn> is empty — correct for static HTML.
// The placeholder key must pass Clerk's format validation (third segment base64-decodes to
// a `.`-containing hostname ending in `$`). `clerk.example.com$` encoded → pk_test_Y2xlcmsuZXhhbXBsZS5jb20k.
const SSR_PUBLISHABLE_KEY =
    process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";

export function render(url: string, staticContent: StaticContentContextValue | null = null): string {
    return renderToString(
        <ClerkProvider publishableKey={SSR_PUBLISHABLE_KEY}>
        <StaticContentProvider value={staticContent}>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                <MemoryRouter initialEntries={[url]}>
                    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
                        <Navbar />
                        <main className="flex-1">
                            <Routes>
                                <Route path="/blog" element={<Blog />} />
                                <Route path="/blog/:slug" element={<BlogPost />} />
                                <Route path="/algorithms" element={<AlgorithmIndex />} />
                                <Route path="/algorithms/:slug" element={<AlgorithmPost />} />
                                <Route path="/demos" element={<DemoIndex />} />
                                <Route path="/demos/:slug" element={<DemoPage />} />
                                <Route path="/tools/target-generator" element={
                                    <div className="max-w-3xl mx-auto px-6 py-16 text-center">
                                        <h1 className="text-3xl font-bold tracking-tight mb-4">Calibration Target Generator</h1>
                                        <p className="text-muted-foreground">
                                            Generate calibration targets — chessboard, ChArUco, marker board, ring grid — with SVG, PNG, DXF, and ZIP downloads.
                                        </p>
                                    </div>
                                } />
                            </Routes>
                        </main>
                        <Footer />
                    </div>
                </MemoryRouter>
            </ThemeProvider>
        </StaticContentProvider>
        </ClerkProvider>,
    );
}
