import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
    const location = useLocation();

    return (
        <nav className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50 flex items-center px-6 justify-between animate-in slide-in-from-top-4 duration-500">
            <Link to="/" className="font-bold text-xl tracking-tighter">
                VV.
            </Link>
            <div className="flex space-x-6 text-sm font-medium">
                <Link
                    to="/editor"
                    className={`hover:text-foreground transition-colors ${location.pathname.startsWith('/editor') ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                    Editor
                </Link>
                <Link
                    to="/blog"
                    className={`hover:text-foreground transition-colors ${location.pathname.startsWith('/blog') ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                    Blog
                </Link>
                <a
                    href="https://github.com/vitalyvorobyev"
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    GitHub
                </a>
            </div>
        </nav>
    );
}
