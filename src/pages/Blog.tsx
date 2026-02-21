import { Link } from "react-router-dom";

export default function Blog() {
    return (
        <div className="max-w-[800px] mx-auto py-16 space-y-8 animate-in fade-in py-8 px-4">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Blog </h1>
                <p className="text-muted-foreground text-lg">
                    Thoughts on algorithms, computer vision, and building intelligent systems.
                </p>
            </div>

            <div className="space-y-6">
                {/* Placeholder for blog posts */}
                <div className="p-6 rounded-xl border border-border hover:border-foreground/20 transition-colors group">
                    <Link to="/blog/example">
                        <h2 className="text-2xl font-semibold group-hover:underline">Camera Calibration and PnP</h2>
                        <p className="text-muted-foreground mt-2">
                            Deep dive into solving the Perspective-n-Point problem for visual odometry.
                        </p>
                        <div className="text-sm font-mono text-muted-foreground mt-4">Oct 24, 2026</div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
