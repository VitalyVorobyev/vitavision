import "./App.css";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";

import HomePage from "./pages/HomePage";
import CvPage from "./pages/CvPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import DemosPage from "./pages/DemosPage";
import DemoDetailPage from "./pages/DemoDetailPage";


export default function App() {
    return (
        <Router basename={import.meta.env.BASE_URL}>
            <AppShell>
                <Routes>
                    <Route path="/" element={<HomePage/>} />
                    <Route path="/cv" element={<CvPage/>} />
                    <Route path="/blog" element={<BlogPage/>} />
                    <Route path="/blog/:id" element={<BlogPostPage/>} />
                    <Route path="/demos" element={<DemosPage/>} />
                    <Route path="/demos/:slug" element={<DemoDetailPage/>} />
                </Routes>
            </AppShell>
        </Router>
    );
};
