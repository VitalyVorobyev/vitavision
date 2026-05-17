import { Link } from "react-router-dom";

interface TagBadgeProps {
    tag: string;
    active?: boolean;
    onClick?: (tag: string) => void;
    to?: string;
}

export default function TagBadge({ tag, active, onClick, to }: TagBadgeProps) {
    const base =
        "inline-block text-xs font-medium px-2.5 py-0.5 rounded-full transition-colors";
    const colors = active
        ? "bg-foreground text-background"
        : "bg-muted text-muted-foreground hover:bg-muted/80";

    if (to) {
        return (
            <Link to={to} className={`${base} ${colors}`}>
                {tag}
            </Link>
        );
    }

    return onClick ? (
        <button className={`${base} ${colors}`} onClick={() => onClick(tag)}>
            {tag}
        </button>
    ) : (
        <span className={`${base} ${colors}`}>{tag}</span>
    );
}
