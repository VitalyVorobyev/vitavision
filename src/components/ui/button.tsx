
function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

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
