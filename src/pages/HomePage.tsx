import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, ArrowRightCircle } from "lucide-react";

import Card from "../components/ui/Card";
import Separator from "../components/ui/Separator";

import { type Demo } from "../types";

import { DEMOS, } from "../data/demos";
import { POSTS } from "../data/posts";

const Hero = () => {
    const navigate = useNavigate();

    return (
        <section className="hero">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="badge" style={{ background: "var(--primary-10)", color: "var(--primary)", border: "none" }}>
                    Site is under construction
                </div>
                <h1 style={{ fontSize: 36, lineHeight: 1.2, margin: "16px 0", fontWeight: 800 }}>
                    Computer Vision, Image Processing & 3D — <span style={{ color: "var(--primary)" }}>pragmatic engineering</span>
                </h1>
                <p style={{ color: "var(--muted)", fontSize: 18, marginBottom: 16 }}>
                    I design production-ready CV/3D systems and build interactive demos to explain the ideas behind them.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link className="btn btn-primary" to="/demos">Explore Demos <ArrowRightCircle size={16}/></Link>
                    <button className="btn btn-outline" onClick={() => navigate("/blog")}>Read the Blog</button>
                </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
                <div className="featured">
                    <div style={{ textAlign: "center", padding: 16 }}>
                        <div style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 12, color: "var(--muted)" }}>
                            Featured Areas
                        </div>
                        <div className="tag-cloud" style={{ marginTop: 12 }}>
                            {["Calibration","Stereo","SLAM","Inspection","Optimization","WASM"].map(t => (
                                <span key={t} className="badge secondary">{t}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

const DemoCard = ({ demo }: { demo: Demo }) => {
    return (
        <Card key={demo.slug}>
            <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{demo.title}</h3>
                    <span className="badge outline">Demo</span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>{demo.blurb}</p>
            </div>
            <div className="card-content" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {demo.tags.map(t => <span key={t} className="badge secondary">{t}</span>)}
            </div>
            <div className="card-footer">
                <Link className="btn btn-primary" to={`/demos/${demo.slug}`}>Launch</Link>
                {demo.externalUrl && (
                    <a className="btn btn-outline" href={demo.externalUrl} target="_blank" rel="noreferrer">
                        Open <ExternalLink size={16}/>
                    </a>
                )}
            </div>
        </Card>
    );
};

const Demos = () => {
    return (
        <section className="grid grid-3">
            {DEMOS.map((d) => <DemoCard key={d.slug} demo={d} /> )}
        </section>
    );
};

const LatestPostCard = () => {
    return (
        <Card>
            <div className="card-header">
                <h3 style={{ margin: 0, fontWeight: 600 }}>Latest Post</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                    Thoughts on building CV systems.
                </p>
            </div>
            <div className="card-content">
                {POSTS.slice(0, 1).map(p => (
                    <div key={p.id} style={{ display: "grid", gap: 8 }}>
                        <Link to={`/blog/${p.id}`} style={{ fontSize: 18, fontWeight: 600, textDecoration: "underline" }}>{p.title}</Link>
                        <p style={{ color: "var(--muted)", fontSize: 14 }}>{p.summary}</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {p.tags.map(t => <span key={t} className="badge secondary">{t}</span>)}
                        </div>
                    </div>
                ))}
            </div>
            <div className="card-footer">
                <Link to="/blog" className="btn btn-outline">All posts</Link>
            </div>
        </Card>
    );
};

const AboutCard = () => {
    return (
        <Card>
            <div className="card-header">
                <h3 style={{ margin: 0, fontWeight: 600 }}>About</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Short bio & core skills.</p>
            </div>
            <div className="card-content">
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                    I build modular CV/3D services (C++/Rust/Python/TS) with pragmatic UX. Interested in calibration, robust geometry, and real-time pipelines.
                </p>
                <Separator />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["C++", "Rust", "Python", "TypeScript", "OpenCV", "Eigen", "WebAssembly"].map(s => <span key={s} className="badge outline">{s}</span>)}
                </div>
            </div>
            <div className="card-footer">
                <Link className="btn btn-primary" to="/cv">View CV</Link>
                <a className="btn btn-outline" href="mailto:hello@example.com">Contact</a>
            </div>
        </Card>
    );
};

const HomePage: React.FC = () => {
    return (
        <div style={{ display: "grid", gap: 32 }}>
            <Hero />
            <Demos />

            <section className="grid grid-2">
                <LatestPostCard />
                <AboutCard />
            </section>
        </div>
    );
};

export default HomePage;
