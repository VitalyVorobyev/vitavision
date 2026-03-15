import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Navbar from "./components/layout/Navbar.tsx";
import Footer from "./components/layout/Footer.tsx";

export function render(url: string): string {
    return renderToString(
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <MemoryRouter initialEntries={[url]}>
                <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
                    <Navbar />
                    <main className="flex-1">
                        <Routes>
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:slug" element={<BlogPost />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </MemoryRouter>
        </ThemeProvider>,
    );
}
