import { useTheme } from "next-themes";

export default function Footer() {
    const { theme } = useTheme();

    return (
        <footer className="py-8 border-t border-border mt-auto">
            <div className="mx-auto flex max-w-[800px] flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:px-6 md:flex-row md:text-left">
                <p>© {new Date().getFullYear()} Vitaly Vorobyev. All rights reserved.</p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-4 md:mt-0 md:justify-end">
                    <a href="https://github.com/VitalyVorobyev" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:opacity-75 transition-opacity">
                        <img src={theme === "dark" ? "/github-mark-light.svg" : "/github-mark.svg"} alt="GitHub" width="20" height="20" />
                    </a>
                    <a href="https://www.linkedin.com/in/vitaly-vorobyev/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:opacity-75 transition-opacity">
                        <img src={theme === "dark" ? "/InBug-White.png" : "/InBug-Black.png"} alt="LinkedIn" width="20" height="20" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
