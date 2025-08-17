
interface CardProps {
    className?: string;
    children: React.ReactNode;
};

function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

const Card: React.FC<CardProps> = ({ className, children }) => (
    <div className={classNames("card", className)}>{children}</div>
);

// const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="card-header">{children}</div>;
// const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="card-content">{children}</div>;
// const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => <div className={classNames("card-footer", className)}>{children}</div>;

export default Card;
