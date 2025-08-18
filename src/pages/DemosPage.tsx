import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink } from "lucide-react";

import { DEMOS } from "../data/demos";
import { classNames } from "../utils/helpers";

import Input from "../components/ui/Input";
import Card from "../components/ui/Card";

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
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
                    Demos
                </h1>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search demos..." iconLeft={<Search size={16}/>} />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className={classNames("btn btn-chip", active === "all" && "active")} onClick={() => setActive("all")}>
                    All
                </button>
                {tags.map(t => (
                    <button key={t} className={classNames("btn btn-chip", active === t && "active")} onClick={() => setActive(t)}>{t}</button>
                ))}
            </div>

            <div className="grid grid-3">
                {filtered.map(d => (
                    <Card key={d.slug}>
                        <div className="card-header">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <h3 style={{ margin: 0, fontWeight: 600 }}>
                                    {d.title}
                                </h3>
                                <span className="badge outline">{d.tags[0]}</span>
                            </div>
                            <p style={{ color: "var(--muted)", fontSize: 14 }}>{d.blurb}</p>
                        </div>
                        <div className="card-footer">
                            <Link className="btn btn-primary" to={`/demos/${d.slug}`}>
                                Launch
                            </Link>
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

export default DemosPage;
