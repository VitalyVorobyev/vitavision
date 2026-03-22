import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import './index.css';

import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';

const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const AlgorithmIndex = lazy(() => import('./pages/AlgorithmIndex'));
const AlgorithmPost = lazy(() => import('./pages/AlgorithmPost'));
const Editor = lazy(() => import('./pages/Editor'));
const TargetGenerator = lazy(() => import('./pages/TargetGenerator'));
const About = lazy(() => import('./pages/About'));

function AppLayout() {
    const { pathname } = useLocation();
    const isEditor = pathname === '/editor' || pathname.startsWith('/tools/');

    return (
        <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
            >
                Skip to content
            </a>
            <Navbar />
            <main id="main-content" className="flex-1">
                <Suspense fallback={<div className="flex-1 flex items-center justify-center py-32"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/blog" element={<Blog />} />
                        <Route path="/blog/:slug" element={<BlogPost />} />
                        <Route path="/algorithms" element={<AlgorithmIndex />} />
                        <Route path="/algorithms/:slug" element={<AlgorithmPost />} />
                        <Route path="/editor" element={<Editor />} />
                        <Route path="/tools/target-generator" element={<TargetGenerator />} />
                        <Route path="/about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </main>
            {!isEditor && <Footer />}
        </div>
    );
}

function App() {
    return (
        <HelmetProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <Router>
                    <AppLayout />
                </Router>
                <Toaster richColors closeButton position="bottom-right" />
            </ThemeProvider>
        </HelmetProvider>
    );
}

export default App;
