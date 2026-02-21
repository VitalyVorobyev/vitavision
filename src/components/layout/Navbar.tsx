import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            title="Toggle Theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}

export default function Navbar() {
    const location = useLocation();

    return (
        <nav className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50 flex items-center px-6 justify-between animate-in slide-in-from-top-4 duration-500">
            <Link to="/" className="font-bold text-xl tracking-tighter">
                VV.
            </Link>
            <div className="flex space-x-6 text-sm font-medium items-center">
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
                <ThemeToggle />
            </div>
        </nav>
    );
}
