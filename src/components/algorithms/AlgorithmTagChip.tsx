interface Props {
    tag: string;
    active?: boolean;
    /** Compact size (11px, tighter padding). Default false → 12px. */
    compact?: boolean;
    onToggle?: (tag: string) => void;
    /** Faceted count shown after the tag text. */
    count?: number;
    disabled?: boolean;
}

export default function AlgorithmTagChip({
    tag,
    active = false,
    compact = false,
    onToggle,
    count,
    disabled = false,
}: Props) {
    const sizeClasses = compact
        ? "px-[9px] py-[3px] text-[11px]"
        : "px-[11px] py-1 text-xs";

    const stateClasses = active
        ? "bg-[hsl(var(--surface-hi))] border-[hsl(var(--border))] text-foreground font-semibold"
        : "border-[hsl(var(--border)/0.5)] text-[hsl(var(--foreground)/0.8)] hover:text-foreground hover:border-[hsl(var(--border))]";

    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

    const baseClasses = [
        "inline-flex items-center rounded-full whitespace-nowrap border transition-colors",
        sizeClasses,
        stateClasses,
        disabledClasses,
    ]
        .filter(Boolean)
        .join(" ");

    const inner = (
        <>
            {tag}
            {count !== undefined && (
                <span className="ml-1.5 text-[hsl(var(--muted-foreground))]">
                    {count}
                </span>
            )}
        </>
    );

    if (onToggle) {
        return (
            <button
                type="button"
                role="checkbox"
                aria-checked={active}
                aria-label={tag}
                disabled={disabled}
                onClick={() => onToggle(tag)}
                className={baseClasses}
            >
                {inner}
            </button>
        );
    }

    return <span className={baseClasses}>{inner}</span>;
}
