import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import VitavisionLogo from "../shared/VitavisionLogo";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

const NAV_ITEMS = [
    { to: "/blog", label: "Blog", active: (pathname: string) => pathname.startsWith("/blog") },
    { to: "/algorithms", label: "Algorithms", active: (pathname: string) => pathname.startsWith("/algorithms") },
    { to: "/demos", label: "Demos", active: (pathname: string) => pathname.startsWith("/demos") },
    { to: "/editor", label: "Editor", active: (pathname: string) => pathname.startsWith("/editor") },
    { to: "/tools/target-generator", label: "Targets", active: (pathname: string) => pathname.startsWith("/tools") },
    { to: "/about", label: "About", active: (pathname: string) => pathname === "/about" },
] as const;

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Toggle dark / light mode"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}

function NavDivider() {
    return (
        <span
            className="h-4 w-px bg-border opacity-60"
            aria-hidden="true"
        />
    );
}

function NavLinkItem({
    to,
    label,
    active,
    onClick,
}: {
    to: string;
    label: string;
    active: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`transition-colors hover:text-foreground ${
                active ? "text-foreground" : "text-muted-foreground"
            }`}
        >
            {label}
        </Link>
    );
}

export default function Navbar() {
    const location = useLocation();
    const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const navItems = useMemo(
        () => NAV_ITEMS.map((item) => ({ ...item, active: item.active(location.pathname) })),
        [location.pathname],
    );
    const mobileOpen = mobileOpenPath === location.pathname;
    const openMobileNav = () => setMobileOpenPath(location.pathname);
    const closeMobileNav = () => setMobileOpenPath(null);

    useEffect(() => {
        if (!mobileOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeMobileNav();
            }
        };

        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileOpen]);

    return (
        <>
            <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm animate-in slide-in-from-top-4 duration-500 sm:px-6">
                <Link to="/" className="flex items-center" aria-label="Vitavision home">
                    <VitavisionLogo variant="mark" className="h-9 w-auto text-foreground" />
                </Link>

                <div className="hidden items-center space-x-4 text-sm font-medium md:flex">
                    {navItems.map((item) => (
                        <NavLinkItem
                            key={item.to}
                            to={item.to}
                            label={item.label}
                            active={item.active}
                        />
                    ))}
                    <NavDivider />
                    <ThemeToggle />
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button
                                type="button"
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                Sign in
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                </div>

                <div className="flex items-center gap-1 md:hidden">
                    <ThemeToggle />
                    <button
                        type="button"
                        onClick={openMobileNav}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Open navigation"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-navigation"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </nav>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-background/65 backdrop-blur-sm"
                        aria-label="Close navigation"
                        onClick={closeMobileNav}
                    />
                    <div
                        id="mobile-navigation"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mobile navigation"
                        className="absolute right-0 top-0 flex h-full w-[min(22rem,100vw)] flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right-6 duration-200"
                    >
                        <div className="flex items-center justify-between border-b border-border px-4 py-4">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                                    Navigation
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Vitavision sections
                                </div>
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={closeMobileNav}
                                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label="Close navigation"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={closeMobileNav}
                                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                                        item.active
                                            ? "border-primary/30 bg-primary/10 text-foreground"
                                            : "border-border/70 bg-background text-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="mt-2 border-t border-border pt-3">
                                <SignedOut>
                                    <SignInButton mode="modal">
                                        <button
                                            type="button"
                                            className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                                        >
                                            Sign in
                                        </button>
                                    </SignInButton>
                                </SignedOut>
                                <SignedIn>
                                    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3">
                                        <UserButton afterSignOutUrl="/" />
                                        <span className="text-sm text-muted-foreground">Account</span>
                                    </div>
                                </SignedIn>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
