import React, { useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Search,
  ArrowRightCircle,
} from "lucide-react";

import Card from "./components/ui/Card";
import AppShell from "./components/layout/AppShell";

/********************
 * Helpers
 ********************/
function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

/********************
 * Demo Components (stubs)
 ********************/
const EdgeDetectDemo: React.FC = () => (
  <div style={{ display: "grid", gap: 12 }}>
    <h3 style={{ fontSize: 20, fontWeight: 600 }}>Sobel Edge Preview</h3>
    <p style={{ color: "var(--muted)", fontSize: 14 }}>Drop an image to run a simple Sobel filter in a WebWorker (placeholder).</p>
    <div style={{ height: 192, border: "1px dashed var(--border)", borderRadius: 16, display: "grid", placeItems: "center", background: "var(--bg-soft)" }}>
      <span style={{ color: "var(--muted)" }}>Coming soon – plug in your WASM / WebGL kernel</span>
    </div>
  </div>
);

const CameraCalibDemo: React.FC = () => (
  <div style={{ display: "grid", gap: 12 }}>
    <h3 style={{ fontSize: 20, fontWeight: 600 }}>Planar Calibration Sandbox</h3>
    <p style={{ color: "var(--muted)", fontSize: 14 }}>Visualize chessboard detections, reprojection error, and undistortion (placeholder UI).</p>
    <div style={{ height: 192, border: "1px dashed var(--border)", borderRadius: 16, display: "grid", placeItems: "center", background: "var(--bg-soft)" }}>
      <span style={{ color: "var(--muted)" }}>Hook up your CV pipeline here</span>
    </div>
  </div>
);



/********************
 * Layout & Pages
 ********************/

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: "grid", gap: 32 }}>
      <section className="hero">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="badge" style={{ background: "var(--primary-10)", color: "var(--primary)", border: "none" }}>Available for consulting</div>
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
              <div style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 12, color: "var(--muted)" }}>Featured Areas</div>
              <div className="tag-cloud" style={{ marginTop: 12 }}>
                {["Calibration","Stereo","SLAM","Inspection","Optimization","WASM"].map(t => (
                  <span key={t} className="badge secondary">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-3">
        {DEMOS.map((d) => (
          <Card key={d.slug}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontWeight: 600 }}>{d.title}</h3>
                <span className="badge outline">Demo</span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>{d.blurb}</p>
            </div>
            <div className="card-content" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {d.tags.map(t => <span key={t} className="badge secondary">{t}</span>)}
            </div>
            <div className="card-footer">
              <Link className="btn btn-primary" to={`/demos/${d.slug}`}>Launch</Link>
              {d.externalUrl && (
                <a className="btn btn-outline" href={d.externalUrl} target="_blank" rel="noreferrer">Open <ExternalLink size={16}/></a>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section className="grid grid-2">
        <Card>
          <div className="card-header">
            <h3 style={{ margin: 0, fontWeight: 600 }}>Latest Post</h3>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Thoughts on building CV systems.</p>
          </div>
          <div className="card-content">
            {POSTS.slice(0,1).map(p => (
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
      </section>
    </div>
  );
};

const CvPage: React.FC = () => {
  const experience = [
    { role: "Product Owner / CV Engineer", company: "QUICK Calibration Kit", period: "2025 — present", bullets: [
      "Architected modular services for sensor/robot/calibration with Zenoh IPC.",
      "Designed discovery & event-driven observers for UI sync.",
      "Prototyped calibration UIs and demo sandboxes.",
    ]},
    { role: "Computer Vision Engineer", company: "Industrial Inspection", period: "2022 — 2025", bullets: [
      "Ellipse detection & geometric feature pipelines (C++/OpenCV).",
      "Real-time streaming and WASM visualization tools.",
    ]},
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Curriculum Vitae</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Compact overview; ask for full PDF for details.</p>
      </div>

      <Card>
        <div className="card-header"><h3 style={{ margin: 0, fontWeight: 600 }}>Experience</h3></div>
        <div className="card-content" style={{ display: "grid", gap: 16 }}>
          {experience.map(e => (
            <div key={`${e.company}-${e.role}`} style={{ position: "relative", paddingLeft: 16 }}>
              <div style={{ position: "absolute", left: 0, top: 6, height: 8, width: 8, borderRadius: 99, background: "var(--primary)" }} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 600 }}>{e.role} — {e.company}</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>{e.period}</div>
              </div>
              <ul style={{ margin: "8px 0 0 18px", color: "var(--muted)", fontSize: 14, padding: 0 }}>
                {e.bullets.map(b => <li key={`${e.company}-${e.role}-${b}`}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="card-header"><h3 style={{ margin: 0, fontWeight: 600 }}>Skills</h3></div>
        <div className="card-content" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["C++", "Rust", "Python", "TypeScript", "OpenCV", "Eigen", "Pytorch", "React", "Tauri", "Zenoh", "Docker"].map(s => <span key={s} className="badge secondary">{s}</span>)}
        </div>
      </Card>

      <Card>
        <div className="card-header"><h3 style={{ margin: 0, fontWeight: 600 }}>Education</h3></div>
        <div className="card-content"><div style={{ color: "var(--muted)", fontSize: 14 }}>M.Sc. (or equivalent) in Computer Science / Applied Math.</div></div>
      </Card>
    </div>
  );
};

const BlogPage: React.FC = () => {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const allTags = useMemo(() => Array.from(new Set(POSTS.flatMap(p => p.tags))).sort(), []);

  const filtered = POSTS.filter(p =>
    (!q || p.title.toLowerCase().includes(q.toLowerCase()) || p.summary.toLowerCase().includes(q.toLowerCase())) &&
    (!active || p.tags.includes(active))
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Blog</h1>
        <Input placeholder="Search posts..." value={q} onChange={(e) => setQ(e.target.value)} iconLeft={<Search size={16}/>} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={classNames("btn btn-chip", !active && "active")} onClick={() => setActive(null)}>All</button>
        {allTags.map(t => (
          <button key={t} className={classNames("btn btn-chip", active === t && "active")} onClick={() => setActive(t)}>{t}</button>
        ))}
      </div>

      <div className="grid grid-2">
        {filtered.map(p => (
          <Card key={p.id}>
            <div className="card-header">
              <Link to={`/blog/${p.id}`} style={{ fontSize: 18, fontWeight: 600, textDecoration: "underline" }}>{p.title}</Link>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(p.date).toLocaleDateString()}</div>
            </div>
            <div className="card-content"><p style={{ color: "var(--muted)", margin: 0 }}>{p.summary}</p></div>
            <div className="card-footer" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.tags.map(t => <span key={t} className="badge secondary">{t}</span>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const BlogPostPage: React.FC = () => {
  const { id } = useParams();
  const post = POSTS.find(p => p.id === id);
  if (!post) return <NotFound />;
  return (
    <article className="prose">
      <h1>{post.title}</h1>
      <p className="meta">{new Date(post.date).toLocaleDateString()} — {post.tags.map(t => `#${t}`).join(" ")}</p>
      <Separator />
      <p>{post.content}</p>
    </article>
  );
};

const DemosPage: React.FC = () => {
  const [q, setQ] = useState("");
  const tags = useMemo(() => Array.from(new Set(DEMOS.flatMap(d => d.tags))).sort(), []);
  const [active, setActive] = useState<string | "all">("all");

  const filtered = DEMOS.filter(d =>
    (!q || d.title.toLowerCase().includes(q.toLowerCase()) || d.blurb.toLowerCase().includes(q.toLowerCase())) &&
    (active === "all" || d.tags.includes(active))
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Demos</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search demos..." iconLeft={<Search size={16}/>} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={classNames("btn btn-chip", active === "all" && "active")} onClick={() => setActive("all")}>All</button>
        {tags.map(t => (
          <button key={t} className={classNames("btn btn-chip", active === t && "active")} onClick={() => setActive(t)}>{t}</button>
        ))}
      </div>

      <div className="grid grid-3">
        {filtered.map(d => (
          <Card key={d.slug}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontWeight: 600 }}>{d.title}</h3>
                <span className="badge outline">{d.tags[0]}</span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>{d.blurb}</p>
            </div>
            <div className="card-footer">
              <Link className="btn btn-primary" to={`/demos/${d.slug}`}>Launch</Link>
              {d.externalUrl && (
                <a className="btn btn-outline" href={d.externalUrl} target="_blank" rel="noreferrer">Open <ExternalLink size={16}/></a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const DemoDetailPage: React.FC = () => {
  const { slug } = useParams();
  const demo = DEMOS.find(d => d.slug === slug);
  if (!demo) return <NotFound />;
  const Comp = demo.Component;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{demo.title}</h1>
          <p style={{ color: "var(--muted)" }}>{demo.blurb}</p>
        </div>
        {demo.externalUrl && (
          <a className="btn btn-outline" href={demo.externalUrl} target="_blank" rel="noreferrer">Open standalone <ExternalLink size={16}/></a>
        )}
      </div>
      <Separator />
      <Comp />
    </div>
  );
};

const NotFound: React.FC = () => (
  <div style={{ textAlign: "center", padding: "64px 0" }}>
    <h1 style={{ fontSize: 28, marginBottom: 8 }}>404 — Not Found</h1>
    <p style={{ color: "var(--muted)" }}>The page you’re looking for doesn’t exist.</p>
    <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Go Home</Link>
  </div>
);

/********************
 * App
 ********************/

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/cv" element={<CvPage/>} />
          <Route path="/blog" element={<BlogPage/>} />
          <Route path="/blog/:id" element={<BlogPostPage/>} />
          <Route path="/demos" element={<DemosPage/>} />
          <Route path="/demos/:slug" element={<DemoDetailPage/>} />
          <Route path="*" element={<NotFound/>} />
        </Routes>
      </AppShell>
    </Router>
  );
}
