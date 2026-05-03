/**
 * Pre-bake node positions for the Atlas Constellation view.
 *
 * Reads `src/generated/content-index.ts` + `src/generated/content-graph.ts`,
 * groups every node by a coarse "cluster" (mirrors the Map-view columns), and
 * tiles cluster grid positions inside the SVG viewport. The output is a
 * deterministic position-per-slug map, written to
 * `src/generated/atlas-graph-layout.ts`.
 *
 * Wired into `bun run build` via `scripts/content-build.ts` so the layout is
 * always emitted alongside the rest of the generated content.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { algorithmPages, modelPages, conceptPages } from "../src/generated/content-index.ts";

interface NodeInput {
    slug: string;
    kind: "algorithm" | "model" | "concept";
    category: string;
    title: string;
}

const CLUSTERS = [
    {
        id: "fundamentals",
        title: "Fundamentals",
        categories: new Set(["image-formation", "explainers"]),
    },
    {
        id: "geometry",
        title: "Geometry",
        categories: new Set(["geometry"]),
    },
    {
        id: "detectors",
        title: "Feature detectors",
        categories: new Set(["corner-detection", "feature-theory", "detection", "foundation-ssl"]),
    },
    {
        id: "applications",
        title: "Applications",
        categories: new Set(["calibration", "calibration-targets", "calibration-learning"]),
    },
];

interface ClusterAnchor {
    cx: number;
    cy: number;
    /** Half-width of the cluster's bounding box. */
    rx: number;
    /** Half-height of the cluster's bounding box. */
    ry: number;
}

const VIEWBOX_W = 1000;
const VIEWBOX_H = 600;
const PADDING_X = 70;
const PADDING_Y = 60;

const clusterCount = CLUSTERS.length;
const clusterWidth = (VIEWBOX_W - PADDING_X * 2) / clusterCount;
const clusterHeight = VIEWBOX_H - PADDING_Y * 2;

const clusterAnchors: ClusterAnchor[] = CLUSTERS.map((_, i) => ({
    cx: PADDING_X + clusterWidth * (i + 0.5),
    cy: PADDING_Y + clusterHeight * 0.5,
    rx: clusterWidth * 0.42,
    ry: clusterHeight * 0.42,
}));

function clusterIndexFor(category: string): number {
    for (let i = 0; i < CLUSTERS.length; i++) {
        if (CLUSTERS[i].categories.has(category)) return i;
    }
    // Unknown category → applications column (mirrors the Map view fallback).
    return CLUSTERS.length - 1;
}

/** Deterministic 32-bit hash → [0,1). Stable across runs. */
function hash01(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}

function layoutCluster(nodes: NodeInput[], anchor: ClusterAnchor): Record<string, { x: number; y: number; cluster: string }> {
    if (nodes.length === 0) return {};
    // Sort for stable assignment regardless of input order.
    const sorted = [...nodes].sort((a, b) => a.slug.localeCompare(b.slug));
    const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * (anchor.rx / Math.max(anchor.ry, 1)))));
    const rows = Math.ceil(sorted.length / cols);
    const stepX = cols > 1 ? (anchor.rx * 2) / (cols - 1) : 0;
    const stepY = rows > 1 ? (anchor.ry * 2) / (rows - 1) : 0;

    const result: Record<string, { x: number; y: number; cluster: string }> = {};
    sorted.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const baseX = anchor.cx - anchor.rx + col * stepX;
        const baseY = anchor.cy - anchor.ry + row * stepY;
        // Small deterministic jitter so the grid doesn't look mechanical.
        const jitterX = (hash01(node.slug + "-x") - 0.5) * stepX * 0.35;
        const jitterY = (hash01(node.slug + "-y") - 0.5) * stepY * 0.35;
        result[node.slug] = { x: baseX + jitterX, y: baseY + jitterY, cluster: CLUSTERS[clusterIndexFor(node.category)].id };
    });
    return result;
}

function main(): void {
    const inputs: NodeInput[] = [
        ...algorithmPages.map<NodeInput>((p) => ({
            slug: p.slug,
            kind: "algorithm",
            category: p.frontmatter.category,
            title: p.frontmatter.title,
        })),
        ...modelPages.map<NodeInput>((p) => ({
            slug: p.slug,
            kind: "model",
            category: p.frontmatter.category,
            title: p.frontmatter.title,
        })),
        ...conceptPages.map<NodeInput>((p) => ({
            slug: p.slug,
            kind: "concept",
            category: p.frontmatter.category,
            title: p.frontmatter.title,
        })),
    ];

    const layout: Record<string, { x: number; y: number; cluster: string }> = {};
    for (let i = 0; i < CLUSTERS.length; i++) {
        const cluster = CLUSTERS[i];
        const nodesInCluster = inputs.filter((n) => clusterIndexFor(n.category) === i);
        Object.assign(layout, layoutCluster(nodesInCluster, clusterAnchors[i]));
        // Flag any cluster that ended up empty so reviewers notice unmapped categories.
        if (nodesInCluster.length === 0) {
            console.warn(`atlas:layout — cluster "${cluster.id}" is empty after mapping`);
        }
    }

    const clusterMeta = CLUSTERS.map((c, i) => ({
        id: c.id,
        title: c.title,
        cx: clusterAnchors[i].cx,
        cy: clusterAnchors[i].cy,
    }));

    const lines = [
        "// Auto-generated by scripts/computeConstellationLayout.ts — do not edit manually.",
        "",
        "export interface AtlasLayoutNode { x: number; y: number; cluster: string; }",
        "export interface AtlasLayoutCluster { id: string; title: string; cx: number; cy: number; }",
        "",
        `export const atlasLayoutViewBox = { width: ${VIEWBOX_W}, height: ${VIEWBOX_H} };`,
        "",
        `export const atlasLayout: Record<string, AtlasLayoutNode> = ${JSON.stringify(layout, null, 2)};`,
        "",
        `export const atlasLayoutClusters: AtlasLayoutCluster[] = ${JSON.stringify(clusterMeta, null, 2)};`,
        "",
    ];
    const outPath = join(import.meta.dir, "..", "src", "generated", "atlas-graph-layout.ts");
    writeFileSync(outPath, lines.join("\n"), "utf-8");
    console.log(`atlas:layout — laid out ${Object.keys(layout).length} node(s) across ${CLUSTERS.length} cluster(s) → ${outPath}`);
}

main();
