// Sticky section header spanning the full main column.
// The nav bar is sticky top-0 h-16 (64px). Section headers stick just below it.

export function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="-mx-10 px-10 sticky top-16 z-10 bg-[hsl(var(--background))]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-baseline gap-2.5 pt-5 pb-3 border-b border-[hsl(var(--border)/0.25)]">
                <span>{label}</span>
                <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">
                    {count}
                </span>
            </h2>
        </div>
    );
}

export function MobileSectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-baseline gap-2.5 mt-5 mb-3">
            <span>{label}</span>
            <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">
                {count}
            </span>
        </h2>
    );
}
