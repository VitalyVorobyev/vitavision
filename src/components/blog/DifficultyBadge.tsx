interface Props { level: "beginner" | "intermediate" | "advanced"; }

const DOT_COLOR: Record<Props["level"], string> = {
    beginner:     "bg-[hsl(140_50%_45%)]",
    intermediate: "bg-[hsl(38_85%_50%)]",
    advanced:     "bg-[hsl(350_60%_55%)]",
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
            <span className="text-xs text-muted-foreground">{LABEL[level]}</span>
        </span>
    );
}
