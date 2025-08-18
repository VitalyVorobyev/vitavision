
import { classNames } from "../../utils/helpers";

interface ButtonProps {
    className?: string;
    children: React.ReactNode[];
    variant?: "primary" | "outline";
};

const Button = (props:ButtonProps) => {
    return (
        <button className={classNames("btn", props.variant === "primary" ? "btn-primary" : "btn-outline", props.className)}>
            {props.children}
        </button>
    )
};

export default Button;
