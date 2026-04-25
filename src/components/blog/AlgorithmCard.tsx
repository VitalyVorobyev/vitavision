import { Link } from "react-router-dom";
import type { AlgorithmIndexEntry } from "../../lib/content/schema.ts";
import AlgorithmGlyph from "../algorithms/AlgorithmGlyph.tsx";

interface AlgorithmCardProps {
    entry: AlgorithmIndexEntry;
    variant?: "compact" | "horizontal";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DraftBadge() {
    return (
        <span className="inline-block text-[9px] font-bold tracking-wider uppercase bg-[hsl(var(--border))] text-foreground px-1.5 py-px rounded-[3px] mr-1.5 align-[1px]">
            DRAFT
        </span>
    );
}

interface GlyphTileProps {
    slug: string;
    category: AlgorithmIndexEntry["frontmatter"]["category"];
    coverImage?: string;
    title: string;
    size: "sm" | "md"; // sm = 30×30, md = 34×34
}

function GlyphTile({ slug, category, coverImage, title, size }: GlyphTileProps) {
    const sizeClasses = size === "sm"
        ? "w-[30px] h-[30px]"
        : "w-[34px] h-[34px]";
    const radiusClass = size === "sm" ? "rounded-[4px]" : "rounded-md";

    return (
        <div
            className={`${sizeClasses} shrink-0 ${radiusClass} border border-[hsl(var(--border)/0.7)] bg-background grid place-items-center overflow-hidden`}
        >
            {coverImage ? (
                <img
                    src={coverImage}
                    alt={title}
                    className="w-full h-full object-cover"
                />
            ) : (
                <AlgorithmGlyph slug={slug} category={category} />
            )}
        </div>
    );
}

interface FooterProps {
    difficulty?: "beginner" | "intermediate" | "advanced";
}

function Footer({ difficulty }: FooterProps) {
    const label = difficulty
        ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
        : "—";
    return (
        <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-[5px] h-[5px] rounded-full bg-brand shrink-0" />
            {label}
        </div>
    );
}

// ── Variants ──────────────────────────────────────────────────────────────────

function CompactCard({ entry }: { entry: AlgorithmIndexEntry }) {
    const { slug, frontmatter: fm } = entry;
    return (
        <Link
            to={`/algorithms/${slug}`}
            className="flex flex-col gap-1.5 min-h-[112px] rounded-lg border border-border bg-surface p-3 hover:border-foreground/20 transition-colors group"
        >
            {/* Top row */}
            <div className="flex items-start gap-2.5">
                <GlyphTile
                    slug={slug}
                    category={fm.category}
                    coverImage={fm.coverImage}
                    title={fm.title}
                    size="sm"
                />
                <div className="min-w-0 flex-1">
                    {fm.draft && <DraftBadge />}
                    <span className="inline text-[13px] font-semibold leading-tight text-foreground -tracking-[0.1px] group-hover:underline">
                        {fm.title}
                    </span>
                </div>
            </div>

            {/* Description */}
            {fm.summary && (
                <p className="text-[11.5px] text-muted-foreground leading-[1.4] line-clamp-2">
                    {fm.summary}
                </p>
            )}

            {/* Footer */}
            <Footer difficulty={fm.difficulty} />
        </Link>
    );
}

function HorizontalCard({ entry }: { entry: AlgorithmIndexEntry }) {
    const { slug, frontmatter: fm } = entry;
    return (
        <Link
            to={`/algorithms/${slug}`}
            className="flex items-start gap-3 rounded-[10px] border border-border bg-surface p-3.5 group transition-colors hover:border-foreground/20"
        >
            <GlyphTile
                slug={slug}
                category={fm.category}
                coverImage={fm.coverImage}
                title={fm.title}
                size="md"
            />
            <div className="min-w-0 flex-1">
                {/* Title row */}
                <div className="flex items-center gap-1.5">
                    {fm.draft && <DraftBadge />}
                    <span className="text-[14px] font-semibold -tracking-[0.1px] truncate group-hover:underline text-foreground">
                        {fm.title}
                    </span>
                </div>
                {/* Summary */}
                {fm.summary && (
                    <p className="text-xs text-muted-foreground leading-[1.4] line-clamp-2 mt-[3px]">
                        {fm.summary}
                    </p>
                )}
                {/* Footer */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-[5px] h-[5px] rounded-full bg-brand shrink-0" />
                    {fm.difficulty
                        ? fm.difficulty.charAt(0).toUpperCase() + fm.difficulty.slice(1)
                        : "—"}
                </div>
            </div>
        </Link>
    );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function AlgorithmCard({
    entry,
    variant = "compact",
}: AlgorithmCardProps) {
    if (variant === "horizontal") return <HorizontalCard entry={entry} />;
    return <CompactCard entry={entry} />;
}
