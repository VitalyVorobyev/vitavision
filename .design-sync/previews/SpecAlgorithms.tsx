import { ArrowRight } from "lucide-react";
import { SpecAlgorithms } from "vitcv";

// Real usage (src/pages/Home.tsx): a home-tile Link carrying the `group`
// class, with the Spec glyph in a `h-10` row above a label + reveal-on-hover
// arrow.
//
// A plain <a> stands in for react-router-dom's <Link>: this preview file
// bundles from source (story-imports.mjs rule 3), which gives it its OWN
// copy of react-router-dom distinct from the one inside the ambient
// MemoryRouter (bundled into the shipped global). Two separate module
// instances means two separate NavigationContext objects, so a real <Link>
// here reads a context the provider never wrote to and throws ("Cannot
// destructure property 'basename' of ... as it is null") — a static preview
// needs the Link's visual chrome only, never real navigation.
function TileCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ width: 208 }}>
            <a
                href="/algorithms"
                aria-label={`${label} — Browse the practical CV atlas`}
                className="group relative flex min-h-[116px] w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-surface/80 px-3.5 pb-3.5 pt-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/45 focus-visible:border-brand/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                    style={{ background: "radial-gradient(120% 80% at 100% 0%, hsl(var(--brand) / 0.14), transparent 60%)" }}
                />
                <div className="relative flex h-10 items-center">{children}</div>
                <div className="relative mt-auto flex items-end justify-between pt-3">
                    <span className="text-[13px] font-semibold tracking-tight text-foreground">{label}</span>
                    <ArrowRight
                        size={14}
                        strokeWidth={2}
                        aria-hidden
                        className="-translate-x-1 text-muted-foreground/80 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-brand group-hover:opacity-100"
                    />
                </div>
            </a>
        </div>
    );
}

// The rest-state glyph (a tiny directed graph, 46x28 css px) is easy to miss
// at native size on an otherwise blank card — a 4x detail crop makes the
// entry node and edges legible.
function DetailCrop({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 200, height: 128 }} className="overflow-hidden rounded-md border border-border bg-background p-2">
            <div style={{ transform: "scale(4)", transformOrigin: "top left" }}>{children}</div>
        </div>
    );
}

export const InTileCard = () => (
    <TileCard label="Atlas">
        <SpecAlgorithms />
    </TileCard>
);

export const Detail = () => (
    <DetailCrop>
        <SpecAlgorithms />
    </DetailCrop>
);
