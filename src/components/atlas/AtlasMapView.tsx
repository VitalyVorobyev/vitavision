import { useMemo } from "react";
import { Link } from "react-router-dom";
import useAtlasGraph from "../../hooks/useAtlasGraph.ts";
import type { AtlasNode } from "../../hooks/useAtlasGraph.ts";
import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
    ConceptIndexEntry,
} from "../../lib/content/schema.ts";
import type { AlgorithmsFilters } from "../../hooks/useAlgorithmsFilters.ts";

interface AtlasMapViewProps {
    algorithms: AlgorithmIndexEntry[];
    models: ModelIndexEntry[];
    concepts: ConceptIndexEntry[];
    filters: AlgorithmsFilters;
    /** MiniSearch slug set (or null when query empty). */
    searchMatchedSlugs: Set<string> | null;
}

interface MapColumn {
    id: string;
    title: string;
    /** Nodes whose `domain` matches one of these IDs land in this column. */
    domains: string[];
    /** Visual role for cards in this column. */
    role: "neutral" | "detector" | "application";
}

/**
 * 4-column dependency layout. Order is intentional: read left-to-right,
 * fundamentals → geometry → detectors → applications.
 *
 * Domains listed here are the actual ones from the unified domain taxonomy.
 * A node whose domain isn't mapped lands in the rightmost "Applications"
 * column — better than dropping it silently when a new domain is added.
 */
const MAP_COLUMNS: MapColumn[] = [
    {
        id: "fundamentals",
        title: "Fundamentals",
        domains: ["image-formation"],
        role: "neutral",
    },
    {
        id: "geometry",
        title: "Geometry",
        domains: ["geometry"],
        role: "neutral",
    },
    {
        id: "detectors",
        title: "Feature detectors",
        domains: ["features", "detection"],
        role: "detector",
    },
    {
        id: "applications",
        title: "Applications",
        domains: ["calibration", "targets", "stitching", "depth"],
        role: "application",
    },
];

const ROLE_CARD_CLASS: Record<MapColumn["role"], string> = {
    neutral:     "border-white/[0.08] bg-white/[0.025]",
    detector:    "border-blue-500/30 bg-blue-500/[0.06]",
    application: "border-amber-500/25 bg-amber-500/[0.04]",
};

function nodeMatches(
    node: AtlasNode,
    filters: AlgorithmsFilters,
    searchMatchedSlugs: Set<string> | null,
): boolean {
    // Map view ignores the `kind` filter for visual clarity (per spec).
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

export default function AtlasMapView({
    algorithms,
    models,
    concepts,
    filters,
    searchMatchedSlugs,
}: AtlasMapViewProps) {
    const { nodes } = useAtlasGraph({ algorithms, models, concepts });

    // Bucket nodes into columns; an unmapped domain falls into the rightmost column.
    const columnEntries = useMemo(() => {
        const lookup = new Map<string, MapColumn>();
        for (const col of MAP_COLUMNS) {
            for (const dom of col.domains) lookup.set(dom, col);
        }
        const fallback = MAP_COLUMNS[MAP_COLUMNS.length - 1];
        const buckets = new Map<string, AtlasNode[]>();
        for (const col of MAP_COLUMNS) buckets.set(col.id, []);
        for (const node of nodes) {
            const col = (node.domain ? lookup.get(node.domain) : undefined) ?? fallback;
            buckets.get(col.id)!.push(node);
        }
        for (const list of buckets.values()) {
            list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
        }
        return buckets;
    }, [nodes]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-x-2 gap-y-6">
            {MAP_COLUMNS.map((col, idx) => (
                <div key={col.id} className="contents md:contents">
                    <div className="min-w-0">
                        <h3 className="text-[10px] font-mono font-semibold tracking-[0.18em] uppercase text-slate-500 pb-1.5 border-b border-white/[0.06] mb-3">
                            {col.title}
                        </h3>
                        <ul className="m-0 p-0 list-none flex flex-col gap-2">
                            {(columnEntries.get(col.id) ?? []).map((node) => {
                                const matches = nodeMatches(node, filters, searchMatchedSlugs);
                                return (
                                    <li key={node.slug}>
                                        <Link
                                            to={node.path}
                                            className={`block border rounded-md px-2.5 py-2 text-[12.5px] transition-opacity hover:border-foreground/40 ${ROLE_CARD_CLASS[col.role]} ${matches ? "" : "opacity-25"}`}
                                        >
                                            {node.title}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    {idx < MAP_COLUMNS.length - 1 && (
                        <div className="hidden md:flex items-center justify-center text-slate-400/25 text-xl select-none" aria-hidden="true">
                            →
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
