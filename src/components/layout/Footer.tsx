import { useTheme } from "next-themes";

export default function Footer() {
    const { theme } = useTheme();

    return (
        <footer className="py-8 border-t border-border mt-auto">
            <div className="max-w-[800px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} Vitaly Vorobyev. All rights reserved.</p>
                <div className="flex items-center space-x-4 mt-4 md:mt-0">
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
