import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Editor from './pages/Editor';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import './index.css';

import { ThemeProvider } from 'next-themes';

function App() {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Router>
                <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
                    <Navbar />
                    <main className="flex-1">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:slug" element={<BlogPost />} />
                            <Route path="/editor" element={<Editor />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </ThemeProvider>
    );
}

export default App;
