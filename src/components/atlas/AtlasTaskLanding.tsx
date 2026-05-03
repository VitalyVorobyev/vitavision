import { useMemo } from "react";
import { Link } from "react-router-dom";
import { algorithmPages, modelPages, conceptPages } from "../../generated/content-index.ts";
import { atlasTiles, atlasTrails } from "../../content/atlas-trails.ts";
import type { AtlasTile } from "../../content/atlas-trails.ts";
import type {
    AlgorithmsKind,
    AlgorithmsView,
} from "../../hooks/useAlgorithmsFilters.ts";

interface AtlasTaskLandingProps {
    onApply: (apply: {
        kind?: AlgorithmsKind;
        categoryId?: string;
        tags?: string[];
        view: AlgorithmsView;
    }) => void;
    /** Total page count surfaced in the subtitle. */
    totalPages: number;
}

interface AtlasIndexLike {
    slug: string;
    frontmatter: { title: string; date: string; tags: readonly string[]; domain?: string };
    /** Page kind for the route prefix. */
    kind: "algorithm" | "model" | "concept";
}

function tileMatchCount(tile: AtlasTile): number {
    const { kind, categoryId, tags } = tile.apply;
    const sources: AtlasIndexLike[] = [];
    if (kind === "algorithm" || kind === undefined) {
        for (const e of algorithmPages) sources.push({ slug: e.slug, frontmatter: e.frontmatter, kind: "algorithm" });
    }
    if (kind === "model" || kind === undefined) {
        for (const e of modelPages) sources.push({ slug: e.slug, frontmatter: e.frontmatter, kind: "model" });
    }
    if (kind === "concept" || kind === undefined) {
        for (const e of conceptPages) sources.push({ slug: e.slug, frontmatter: e.frontmatter, kind: "concept" });
    }
    return sources.filter((e) => {
        const fm = e.frontmatter;
        if (categoryId && categoryId !== "all" && fm.domain !== categoryId) return false;
        if (tags && tags.length > 0) {
            const hit = tags.every((t) => fm.tags.includes(t));
            if (!hit) return false;
        }
        return true;
    }).length;
}

function buildPathForSlug(slug: string): string | null {
    if (
        algorithmPages.some((p) => p.slug === slug) ||
        modelPages.some((p) => p.slug === slug) ||
        conceptPages.some((p) => p.slug === slug)
    ) {
        return `/atlas/${slug}`;
    }
    return null;
}

function pageKindLabel(slug: string): string {
    if (modelPages.some((p) => p.slug === slug)) return "Model";
    if (conceptPages.some((p) => p.slug === slug)) return "Concept";
    return "Algorithm";
}

export default function AtlasTaskLanding({ onApply, totalPages }: AtlasTaskLandingProps) {
    const tilesWithCounts = useMemo(
        () => atlasTiles.map((tile) => ({ tile, count: tileMatchCount(tile) })),
        [],
    );

    const recentlyAdded = useMemo(() => {
        const all: AtlasIndexLike[] = [
            ...algorithmPages.map((e) => ({ slug: e.slug, frontmatter: e.frontmatter, kind: "algorithm" as const })),
            ...modelPages.map((e) => ({ slug: e.slug, frontmatter: e.frontmatter, kind: "model" as const })),
            ...conceptPages.map((e) => ({ slug: e.slug, frontmatter: e.frontmatter, kind: "concept" as const })),
        ];
        return all
            .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date))
            .slice(0, 4);
    }, []);

    const trail = atlasTrails[0];
    const trailSteps = useMemo(() => {
        if (!trail) return [];
        return trail.steps
            .map((slug) => {
                const path = buildPathForSlug(slug);
                if (!path) return null;
                const all = [
                    ...algorithmPages,
                    ...modelPages,
                    ...conceptPages,
                ];
                const entry = all.find((p) => p.slug === slug);
                if (!entry) return null;
                return {
                    slug,
                    title: entry.frontmatter.title,
                    kindLabel: pageKindLabel(slug),
                    path,
                };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null);
    }, [trail]);

    return (
        <div className="max-w-[1080px] mx-auto px-6 sm:px-14 py-10">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-[-0.025em]">Atlas</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    {totalPages} pages on practical computer vision. Where do you want to start?
                </p>
            </header>

            <h2 className="text-[10.5px] font-mono font-semibold tracking-[0.18em] uppercase text-slate-500 mb-3">
                I want to…
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px] m-0 p-0 list-none mb-12">
                {tilesWithCounts.map(({ tile, count }) => (
                    <li key={tile.id}>
                        <button
                            type="button"
                            onClick={() => onApply({ ...tile.apply, view: "grid" })}
                            className="w-full text-left border border-white/[0.08] rounded-[10px] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04] transition-colors px-5 py-5"
                        >
                            <div className="text-2xl text-blue-500 font-mono font-bold mb-3">{tile.icon}</div>
                            <div className="text-[15px] font-semibold tracking-[-0.01em] mb-1.5">
                                {tile.title}
                            </div>
                            <div className="text-[12.5px] text-muted-foreground leading-[1.5] mb-3">
                                {tile.description}
                            </div>
                            <div className="text-[10.5px] font-mono text-slate-500 tracking-[0.1em]">
                                {count} {count === 1 ? "page" : "pages"} →
                            </div>
                        </button>
                    </li>
                ))}
            </ul>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Curated trail */}
                {trail && trailSteps.length > 0 && (
                    <section>
                        <h2 className="text-[10.5px] font-mono font-semibold tracking-[0.18em] uppercase text-slate-500 mb-3">
                            Curated trail
                        </h2>
                        <div className="text-[15px] font-semibold mb-4">{trail.title}</div>
                        <ol className="m-0 p-0 list-none space-y-3">
                            {trailSteps.map((step, i) => (
                                <li key={step.slug}>
                                    <Link
                                        to={step.path}
                                        className="flex items-center gap-3 group"
                                        onClick={() => onApply({ view: "grid" })}
                                    >
                                        <span className="w-5.5 h-5.5 inline-flex items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/35 text-blue-300 text-[11px] font-mono">
                                            {i + 1}
                                        </span>
                                        <span className="text-[14px] text-foreground group-hover:underline">
                                            {step.title}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500">
                                            {step.kindLabel}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {/* Recently added */}
                <section>
                    <h2 className="text-[10.5px] font-mono font-semibold tracking-[0.18em] uppercase text-slate-500 mb-3">
                        Recently added
                    </h2>
                    <ul className="m-0 p-0 list-none space-y-3">
                        {recentlyAdded.map((entry) => {
                            const path = buildPathForSlug(entry.slug);
                            if (!path) return null;
                            return (
                                <li key={`${entry.kind}:${entry.slug}`}>
                                    <Link
                                        to={path}
                                        className="flex items-center justify-between gap-3 group"
                                        onClick={() => onApply({ view: "grid" })}
                                    >
                                        <span className="text-[14px] text-foreground group-hover:underline truncate">
                                            {entry.frontmatter.title}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                                            {entry.frontmatter.date}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </div>
        </div>
    );
}
