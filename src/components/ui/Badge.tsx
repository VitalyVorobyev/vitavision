import { classNames } from "../../utils/helpers";

interface BadgeProps {
    variant?: "secondary" | "outline";
    className?: string;
    children: React.ReactNode[];
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
