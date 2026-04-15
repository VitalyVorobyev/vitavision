interface Props { level: "beginner" | "intermediate" | "advanced"; }

const STYLES: Record<Props["level"], string> = {
    beginner:     "bg-[hsl(140_30%_96%)] text-[hsl(140_40%_38%)] border-[hsl(140_40%_45%/0.3)] dark:bg-[hsl(140_15%_13%)] dark:text-[hsl(140_35%_58%)] dark:border-[hsl(140_35%_52%/0.4)]",
    intermediate: "bg-[hsl(38_85%_96%)]  text-[hsl(38_85%_38%)]  border-[hsl(38_85%_50%/0.3)]  dark:bg-[hsl(38_40%_13%)]  dark:text-[hsl(38_70%_62%)]  dark:border-[hsl(38_70%_55%/0.4)]",
    advanced:     "bg-[hsl(350_60%_96%)] text-[hsl(350_60%_45%)] border-[hsl(350_60%_50%/0.3)] dark:bg-[hsl(350_30%_14%)] dark:text-[hsl(350_55%_68%)] dark:border-[hsl(350_55%_60%/0.4)]",
};

export default function DifficultyBadge({ level }: Props) {
    return (
        <span className={`inline-block text-[0.7rem] font-mono uppercase tracking-wider border rounded-sm px-1.5 py-0.5 ${STYLES[level]}`}>
            {level}
        </span>
    );
}
