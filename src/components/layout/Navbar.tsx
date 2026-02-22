import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useThemeVariant, type ThemeVariant } from "../../hooks/useThemeVariant";
import { THEME_VARIANTS, VARIANT_SWATCHES } from "../../hooks/themeVariantConstants";

// ── Dark / Light toggle ───────────────────────────────────────────────────────

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            title="Toggle dark / light mode"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}

// ── Theme variant picker (3 color swatches) ───────────────────────────────────

export function ThemeVariantPicker() {
    const { variant, setVariant } = useThemeVariant();

    return (
        /*
         * A slim row of 3 circular swatches. Each swatch shows the accent
         * color of its theme. The active swatch gets a ring that matches the
         * accent so it reads clearly in both light and dark modes.
         */
        <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label="Choose color theme"
        >
            {THEME_VARIANTS.map((v: ThemeVariant) => {
                const { accent, label } = VARIANT_SWATCHES[v];
                const isActive = v === variant;

                return (
                    <button
                        key={v}
                        onClick={() => setVariant(v)}
                        title={label}
                        aria-label={`${label} theme${isActive ? " (active)" : ""}`}
                        aria-pressed={isActive}
                        className={[
                            // Base swatch
                            "h-4 w-4 rounded-full transition-all duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            // Active state: slightly larger
                            isActive
                                ? "scale-125"
                                : "opacity-60 hover:opacity-90 hover:scale-110",
                        ].join(" ")}
                        style={{
                            backgroundColor: accent,
                            // Double-ring: background gap + accent color ring
                            boxShadow: isActive
                                ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${accent}`
                                : undefined,
                        } as React.CSSProperties}
                    />
                );
            })}
        </div>
    );
}

// ── Divider used between picker groups ────────────────────────────────────────

function NavDivider() {
    return (
        <span
            className="h-4 w-px bg-border opacity-60"
            aria-hidden="true"
        />
    );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar() {
    const location = useLocation();

    return (
        <nav className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50 flex items-center px-6 justify-between animate-in slide-in-from-top-4 duration-500">
            <Link to="/" className="font-bold text-xl tracking-tighter">
                VV.
            </Link>
            <div className="flex space-x-4 text-sm font-medium items-center">
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
                <Link
                    to="/about"
                    className={`hover:text-foreground transition-colors ${location.pathname === '/about' ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                    About
                </Link>
                {/* Thin separator between nav links and controls */}
                <NavDivider />

                {/* Theme variant swatches */}
                <ThemeVariantPicker />

                {/* Dark / light toggle */}
                <ThemeToggle />
            </div>
        </nav>
    );
}
