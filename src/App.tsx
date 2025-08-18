import React, { useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";

import { ExternalLink, Search } from "lucide-react";

import Card from "./components/ui/Card";
import AppShell from "./components/layout/AppShell";

/********************
 * Layout & Pages
 ********************/

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
