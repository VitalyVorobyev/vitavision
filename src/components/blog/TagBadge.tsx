import { Link } from "react-router";

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
        ? "bg-fg text-ground"
        : "bg-raised text-fg-muted hover:bg-line/60";

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
