import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAtlasGraph from "../../hooks/useAtlasGraph.ts";
import {
    atlasLayout,
    atlasLayoutClusters,
    atlasLayoutViewBox,
} from "../../generated/atlas-graph-layout.ts";
import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
    ConceptIndexEntry,
} from "../../lib/content/schema.ts";
import type { AlgorithmsFilters } from "../../hooks/useAlgorithmsFilters.ts";
import type { AtlasNode } from "../../hooks/useAtlasGraph.ts";

interface AtlasConstellationViewProps {
    algorithms: AlgorithmIndexEntry[];
    models: ModelIndexEntry[];
    concepts: ConceptIndexEntry[];
    filters: AlgorithmsFilters;
    searchMatchedSlugs: Set<string> | null;
}

interface KindToggles {
    algorithm: boolean;
    model: boolean;
    concept: boolean;
}

function nodeMatchesQuery(
    node: AtlasNode,
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null,
): boolean {
    const tagsOk =
        filters.tags.length === 0 || filters.tags.every((t) => node.tags.includes(t));
    if (!tagsOk) return false;
    if (!filters.query.trim()) return true;
    if (searchMatchedSlugs !== null) return searchMatchedSlugs.has(node.slug);
    const q = filters.query.toLowerCase();
    return (
        node.title.toLowerCase().includes(q) ||
        node.summary.toLowerCase().includes(q)
    );
}

export default function AtlasConstellationView({
    algorithms,
    models,
    concepts,
    filters,
    searchMatchedSlugs,
}: AtlasConstellationViewProps) {
    const navigate = useNavigate();
    const { nodes, edges, nodesBySlug } = useAtlasGraph({ algorithms, models, concepts });

    const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
    const [kinds, setKinds] = useState<KindToggles>({ algorithm: true, model: true, concept: true });

    const counts = useMemo(() => {
        const c = { algorithm: 0, model: 0, concept: 0 };
        for (const n of nodes) c[n.kind]++;
        return c;
    }, [nodes]);

    /** 1-hop neighborhood of the hovered node, used for hover highlighting. */
    const neighborhood = useMemo(() => {
        if (!hoveredSlug) return null;
        const set = new Set<string>([hoveredSlug]);
        for (const e of edges) {
            if (e.from === hoveredSlug) set.add(e.to);
            else if (e.to === hoveredSlug) set.add(e.from);
        }
        return set;
    }, [hoveredSlug, edges]);

    const queryActive = filters.query.trim().length > 0 || filters.tags.length > 0;

    const isVisible = useCallback(
        (slug: string) => {
            const node = nodesBySlug[slug];
            if (!node) return false;
            if (!kinds[node.kind]) return false;
            return true;
        },
        [kinds, nodesBySlug],
    );

    const isQueryMatch = useCallback(
        (slug: string): boolean => {
            const node = nodesBySlug[slug];
            if (!node) return false;
            return nodeMatchesQuery(node, filters, searchMatchedSlugs);
        },
        [nodesBySlug, filters, searchMatchedSlugs],
    );

    /** Final opacity per node, accounting for kind filter, query, and hover. */
    const nodeOpacity = useCallback(
        (slug: string): number => {
            if (!isVisible(slug)) return 0;
            if (neighborhood) return neighborhood.has(slug) ? 1 : 0.25;
            if (queryActive && !isQueryMatch(slug)) return 0.25;
            return 1;
        },
        [isVisible, neighborhood, queryActive, isQueryMatch],
    );

    /** Edge opacity follows the dimmer of its two endpoints. */
    const edgeOpacity = useCallback(
        (from: string, to: string): number => {
            const a = nodeOpacity(from);
            const b = nodeOpacity(to);
            return Math.min(a, b) === 0 ? 0 : Math.min(a, b) * 0.5;
        },
        [nodeOpacity],
    );

    const handlePointerEnter = (slug: string, pointerType: string) => {
        // Hover highlights only on mouse; touch/pen use a separate handler.
        if (pointerType === "mouse") setHoveredSlug(slug);
    };

    const handlePointerLeave = (pointerType: string) => {
        if (pointerType === "mouse") setHoveredSlug(null);
    };

    const handleNodeActivate = (slug: string, pointerType: string) => {
        if (pointerType === "touch" || pointerType === "pen") {
            // First tap: highlight. Second tap on the same node: navigate.
            if (hoveredSlug === slug) {
                navigate(nodesBySlug[slug].path);
            } else {
                setHoveredSlug(slug);
            }
            return;
        }
        navigate(nodesBySlug[slug].path);
    };

    const toggleKind = (kind: keyof KindToggles) => {
        setKinds((prev) => ({ ...prev, [kind]: !prev[kind] }));
    };

    return (
        <div
            className="relative border border-white/[0.06] rounded-[10px] overflow-hidden"
            style={{
                height: 600,
                background:
                    "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.04), rgba(0,0,0,0) 70%)",
            }}
        >
            <svg
                viewBox={`0 0 ${atlasLayoutViewBox.width} ${atlasLayoutViewBox.height}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                style={{ touchAction: "none" }}
                onPointerLeave={(e) => handlePointerLeave(e.pointerType)}
            >
                {/* Cluster labels — anchor near top of each cluster column. */}
                {atlasLayoutClusters.map((c) => (
                    <text
                        key={c.id}
                        x={c.cx}
                        y={28}
                        textAnchor="middle"
                        className="fill-slate-600 font-mono"
                        style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase" }}
                    >
                        {c.title}
                    </text>
                ))}

                {/* Edges */}
                <g>
                    {edges.map((e) => {
                        const a = atlasLayout[e.from];
                        const b = atlasLayout[e.to];
                        if (!a || !b) return null;
                        const opacity = edgeOpacity(e.from, e.to);
                        if (opacity === 0) return null;
                        return (
                            <line
                                key={`${e.from}|${e.to}`}
                                x1={a.x}
                                y1={a.y}
                                x2={b.x}
                                y2={b.y}
                                stroke="rgb(59 130 246)"
                                strokeWidth={1}
                                strokeOpacity={opacity * 0.18}
                            />
                        );
                    })}
                </g>

                {/* Nodes + labels */}
                <g>
                    {nodes.map((node) => {
                        const pos = atlasLayout[node.slug];
                        if (!pos) return null;
                        const opacity = nodeOpacity(node.slug);
                        if (opacity === 0) return null;
                        const isConcept = node.kind === "concept";
                        const r = isConcept ? 5 : 6;
                        const fill = isConcept ? "rgba(203,213,225,0.55)" : "rgb(59 130 246)";
                        return (
                            <g
                                key={node.slug}
                                opacity={opacity}
                                style={{ cursor: "pointer" }}
                                onPointerEnter={(e) => handlePointerEnter(node.slug, e.pointerType)}
                                onPointerDown={(e) => {
                                    if (e.pointerType === "touch" || e.pointerType === "pen") {
                                        e.preventDefault();
                                    }
                                }}
                                onClick={(e) =>
                                    handleNodeActivate(
                                        node.slug,
                                        (e.nativeEvent as PointerEvent).pointerType ?? "mouse",
                                    )
                                }
                            >
                                <circle cx={pos.x} cy={pos.y} r={r} fill={fill} />
                                <text
                                    x={pos.x + r + 4}
                                    y={pos.y + 3.5}
                                    className="fill-slate-300"
                                    style={{ fontSize: 11.5, pointerEvents: "none" }}
                                >
                                    {node.title}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>

            {/* Floating filter chip */}
            <div className="absolute top-4 right-4 px-3 py-2.5 bg-[#0a0f1c]/85 backdrop-blur-md border border-white/[0.08] rounded-lg text-[11px] flex flex-col gap-1.5">
                {(
                    [
                        ["algorithm", "Algorithms"],
                        ["concept",   "Concepts"],
                        ["model",     "Models"],
                    ] as const
                ).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer select-none text-foreground">
                        <input
                            type="checkbox"
                            checked={kinds[k]}
                            onChange={() => toggleKind(k)}
                            className="accent-blue-500"
                        />
                        <span>{label}</span>
                        <span className="text-muted-foreground font-mono">{counts[k]}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
