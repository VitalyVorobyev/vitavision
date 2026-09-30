// Each icon ships in both inks and CSS shows the one for the painted theme, so the
// prerendered HTML is right before any script runs and "system" needs no JS.
export default function Footer() {
    return (
        <footer className="py-8 border-t border-line mt-auto">
            <div className="mx-auto flex max-w-[800px] flex-col items-center justify-between gap-4 px-4 text-center text-sm text-fg-muted sm:px-6 md:flex-row md:text-left">
                <p>© {new Date().getFullYear()} Vitaly Vorobyev. All rights reserved.</p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-4 md:mt-0 md:justify-end">
                    <a href="https://github.com/VitalyVorobyev" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:opacity-75 transition-opacity">
                        <img src="/github-mark.svg" alt="GitHub" width="20" height="20" className="dark:hidden" />
                        <img src="/github-mark-light.svg" alt="GitHub" width="20" height="20" className="hidden dark:inline" />
                    </a>
                    <a href="https://www.linkedin.com/in/vitaly-vorobyev/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:opacity-75 transition-opacity">
                        <img src="/InBug-Black.png" alt="LinkedIn" width="20" height="20" className="dark:hidden" />
                        <img src="/InBug-White.png" alt="LinkedIn" width="20" height="20" className="hidden dark:inline" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
