interface Props { level: "beginner" | "intermediate" | "advanced"; }

const DOT_COLOR: Record<Props["level"], string> = {
    beginner:     "bg-difficulty-beginner",
    intermediate: "bg-difficulty-intermediate",
    advanced:     "bg-difficulty-advanced",
};

const LABEL: Record<Props["level"], string> = {
    beginner:     "Beginner",
    intermediate: "Intermediate",
    advanced:     "Advanced",
};

export default function DifficultyBadge({ level }: Props) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${DOT_COLOR[level]}`} />
            <span className="text-xs text-fg-muted">{LABEL[level]}</span>
        </span>
    );
}
