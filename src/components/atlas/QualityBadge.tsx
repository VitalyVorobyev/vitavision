interface QualityBadgeProps {
    quality?: "stub" | "canonical" | "historical";
}

export default function QualityBadge({ quality }: QualityBadgeProps) {
    if (!quality) return null;

    if (quality === "stub") {
        return (
            <span
                title="This page is a short placeholder and may be expanded later."
                className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400"
            >
                Stub
            </span>
        );
    }

    if (quality === "canonical") {
        return (
            <span
                title="Reviewed flagship page."
                className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary"
            >
                Canonical
            </span>
        );
    }

    if (quality === "historical") {
        return (
            <span
                title="This page describes a method that has been superseded. See the Superseded by link in the sidebar."
                className="inline-flex items-center gap-1 rounded border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
                Historical
            </span>
        );
    }

    return null;
}
