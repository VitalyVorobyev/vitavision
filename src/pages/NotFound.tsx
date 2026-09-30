import { Link } from "react-router";
import SeoHead from "../components/seo/SeoHead";

export default function NotFound() {
    return (
        <div className="max-w-[800px] mx-auto py-16 px-4 text-center space-y-4 animate-in fade-in">
            <SeoHead title="Page not found" description="The page you're looking for doesn't exist." />
            <h1 className="text-6xl font-bold tracking-tight">404</h1>
            <p className="text-lg text-fg-muted">
                The page you're looking for doesn't exist.
            </p>
            <Link
                to="/"
                className="inline-block text-signal underline hover:text-signal/80"
            >
                Back to home
            </Link>
        </div>
    );
}
