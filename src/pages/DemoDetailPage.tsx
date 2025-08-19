import { useParams } from "react-router-dom";

import NotFound from "./NotFoundPage";

import { DEMOS } from "../data/demos";
import { ExternalLink } from "lucide-react";

import Separator from "../components/ui/Separator";

const DemoDetailPage: React.FC = () => {
    const { slug } = useParams();
    const demo = DEMOS.find(d => d.slug === slug);
    if (!demo) return <NotFound />;
    const Comp = demo.Component;
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
                        {demo.title}
                    </h1>
                    <p style={{ color: "var(--muted)" }}>
                        {demo.blurb}
                    </p>
                </div>
                {demo.externalUrl && (
                    <a className="btn btn-outline" href={demo.externalUrl} target="_blank" rel="noreferrer">
                        Open standalone <ExternalLink size={16}/>
                    </a>
                )}
            </div>
            <Separator />
            { Comp && <Comp /> }
        </div>
    );
};

export default DemoDetailPage;
