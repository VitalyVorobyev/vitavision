import { useParams } from "react-router-dom";

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
