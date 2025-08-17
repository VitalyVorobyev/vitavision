
interface BadgeProps {
    variant?: "secondary" | "outline";
    className?: string;
    children: React.ReactNode[];
};

function classNames(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
};

const Badge = (props:BadgeProps) => {
    const { variant = "secondary", className, children } = props;
    return (
        <span className={classNames("badge", variant === "secondary" ? "secondary" : "outline", className)}>
            {children}
        </span>
    );
};

export default Badge;
