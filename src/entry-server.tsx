import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import AlgorithmIndex from "./pages/AlgorithmIndex.tsx";
import AlgorithmPost from "./pages/AlgorithmPost.tsx";
import Navbar from "./components/layout/Navbar.tsx";
import Footer from "./components/layout/Footer.tsx";
import { StaticContentProvider, type StaticContentContextValue } from "./lib/content/ssr-content.tsx";

export function render(url: string, staticContent: StaticContentContextValue | null = null): string {
    return renderToString(
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
        </StaticContentProvider>,
    );
}
