import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
    return (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>
                404 — Not Found
            </h1>
            <p style={{ color: "var(--muted)" }}>
                The page you're looking for doesn't exist.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                Go Home
            </Link>
        </div>
    );
};

export default NotFound;
