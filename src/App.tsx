import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import AlgorithmIndex from './pages/AlgorithmIndex';
import AlgorithmPost from './pages/AlgorithmPost';
import Editor from './pages/Editor';
import TargetGenerator from './pages/TargetGenerator';
import About from './pages/About';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import './index.css';

import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';

function AppLayout() {
    const { pathname } = useLocation();
    const isEditor = pathname === '/editor' || pathname.startsWith('/tools/');

    return (
        <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
            <Navbar />
            <main className="flex-1">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/algorithms" element={<AlgorithmIndex />} />
                    <Route path="/algorithms/:slug" element={<AlgorithmPost />} />
                    <Route path="/editor" element={<Editor />} />
                    <Route path="/tools/target-generator" element={<TargetGenerator />} />
                    <Route path="/about" element={<About />} />
                </Routes>
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
            </ThemeProvider>
        </HelmetProvider>
    );
}

export default App;
