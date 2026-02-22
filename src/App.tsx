import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Editor from './pages/Editor';
import About from './pages/About';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import './index.css';

import { ThemeProvider } from 'next-themes';
import { ThemeVariantProvider } from './hooks/useThemeVariant';

function App() {
    return (
        /*
         * ThemeVariantProvider must be inside ThemeProvider so that both
         * contexts are available to any child component (including Navbar).
         * next-themes handles .dark class; ThemeVariantProvider handles
         * .theme-aubergine / .theme-pine / .theme-oxblood.
         */
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ThemeVariantProvider>
                <Router>
                    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
                        <Navbar />
                        <main className="flex-1">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/blog" element={<Blog />} />
                                <Route path="/blog/:slug" element={<BlogPost />} />
                                <Route path="/editor" element={<Editor />} />
                                <Route path="/about" element={<About />} />
                            </Routes>
                        </main>
                        <Footer />
                    </div>
                </Router>
            </ThemeVariantProvider>
        </ThemeProvider>
    );
}

export default App;
