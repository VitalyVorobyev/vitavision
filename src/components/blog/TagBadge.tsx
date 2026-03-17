interface TagBadgeProps {
    tag: string;
    active?: boolean;
    onClick?: (tag: string) => void;
}

export default function TagBadge({ tag, active, onClick }: TagBadgeProps) {
    const base =
        "inline-block text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors";
    const colors = active
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80";

    return onClick ? (
        <button className={`${base} ${colors}`} onClick={() => onClick(tag)}>
            {tag}
        </button>
    ) : (
        <span className={`${base} ${colors}`}>{tag}</span>
    );
}
