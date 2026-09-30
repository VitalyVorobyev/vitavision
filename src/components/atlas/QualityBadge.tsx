interface QualityBadgeProps {
    quality?: "stub" | "canonical" | "historical";
}

export default function QualityBadge({ quality }: QualityBadgeProps) {
    if (!quality) return null;

    if (quality === "stub") {
        return (
            <span
                title="This page is a short placeholder and may be expanded later."
                className="inline-flex items-center gap-1 rounded border border-ink-amber/40 bg-ink-amber/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-amber"
            >
                Stub
            </span>
        );
    }

    if (quality === "canonical") {
        return (
            <span
                title="Reviewed flagship page."
                className="inline-flex items-center gap-1 rounded border border-signal/30 bg-signal/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-signal"
            >
                Canonical
            </span>
        );
    }

    if (quality === "historical") {
        return (
            <span
                title="This page describes a method that has been superseded. See the Superseded by link in the sidebar."
                className="inline-flex items-center gap-1 rounded border border-ink-slate/40 bg-ink-slate/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-slate"
            >
                Historical
            </span>
        );
    }

    return null;
}
