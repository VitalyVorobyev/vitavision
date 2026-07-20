/**
 * Atlas vault generator.
 *
 * Reads content/{algorithms,models,concepts}/*.md and docs/papers/index.yaml,
 * writes a flat Obsidian-compatible vault under docs/atlas-vault/ where each
 * node is a stub markdown file with [[wikilinks]] for every forward edge.
 *
 * The vault is a derived artifact — never edited by hand. Open the folder
 * in Obsidian and use the graph view to look at the atlas as a graph.
 *
 * Source of truth: content/** + docs/papers/index.yaml. Edits made here are
 * blown away on the next `bun run vault:build`.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import type { RelationType, TypedRelation } from "../src/lib/content/schema.ts";

const REPO_ROOT = join(import.meta.dir, "..");
const CONTENT_DIR = join(REPO_ROOT, "content");
const PAPERS_INDEX = join(REPO_ROOT, "docs", "papers", "index.yaml");
const VAULT_DIR = join(REPO_ROOT, "docs", "atlas-vault");

type NodeType = "algorithm" | "model" | "concept" | "paper";

// ── Relation type → category + label ────────────────────────────────────────
// Mirrors src/components/atlas/RelationshipPanel.tsx (FORWARD_LABEL, ~L14, and
// the three sidebar categories per .claude/CLAUDE.md → "Relations field"). Kept
// as a local copy rather than an import: the component pulls in React,
// react-router-dom, and the generated content graph, none of which belong in
// this Node/Bun build script. Keep in sync by hand if the label text changes.
type RelationCategory = "Lineage" | "Practice" | "Cross-paradigm";

const CATEGORY_ORDER: readonly RelationCategory[] = ["Lineage", "Practice", "Cross-paradigm"];

const RELATION_CATEGORY: Record<RelationType, RelationCategory> = {
    generalized_by: "Lineage",
    alternative_formulation_of: "Lineage",
    parallel_foundation_with: "Lineage",
    extended_by: "Lineage",
    compared_with: "Practice",
    feeds_into: "Practice",
    learned_alternative_of: "Cross-paradigm",
};

const RELATION_LABEL: Record<RelationType, string> = {
    generalized_by: "Generalised by",
    alternative_formulation_of: "Alternative formulation of",
    parallel_foundation_with: "Parallel foundation with",
    extended_by: "Extended by",
    compared_with: "Compared with",
    feeds_into: "Feeds into",
    learned_alternative_of: "Learned alternative of",
};

function sortRelations(relations: TypedRelation[]): TypedRelation[] {
    return [...relations].sort((a, b) => {
        const catDiff =
            CATEGORY_ORDER.indexOf(RELATION_CATEGORY[a.type]) -
            CATEGORY_ORDER.indexOf(RELATION_CATEGORY[b.type]);
        if (catDiff !== 0) return catDiff;
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.target.localeCompare(b.target);
    });
}

interface PageNode {
    slug: string;
    type: "algorithm" | "model" | "concept";
    title: string;
    summary: string;
    prerequisites: string[];
    relations: TypedRelation[];   // authored forward edges only; see readPages()
    failureModes: string[];
    sourcesPrimary?: string;
    sourcesReferences: string[];
}

interface PaperNode {
    id: string;
    title: string;
    authors: string[];
    year?: number;
    venue?: string;
    cites: string[];
}

interface PaperEntry {
    id: string;
    title: string;
    authors?: string[];
    year?: number;
    venue?: string;
    cites?: string[];
}

interface PageFrontmatter {
    title?: string;
    summary?: string;
    prerequisites?: string[];
    relations?: TypedRelation[];
    failureModes?: string[];
    sources?: {
        primary?: string;
        references?: string[];
    };
}

function uniqSorted(values: string[]): string[] {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function readPages(dir: string, type: PageNode["type"]): PageNode[] {
    if (!existsSync(dir)) return [];
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    return files.map((file) => {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data } = matter(raw);
        const fm = data as PageFrontmatter;
        const slug = basename(file, ".md");
        return {
            slug,
            type,
            title: fm.title ?? slug,
            summary: fm.summary ?? "",
            prerequisites: uniqSorted(fm.prerequisites ?? []),
            relations: sortRelations(fm.relations ?? []),
            failureModes: uniqSorted(fm.failureModes ?? []),
            sourcesPrimary: fm.sources?.primary,
            sourcesReferences: uniqSorted(fm.sources?.references ?? []),
        };
    });
}

function readPapers(): PaperNode[] {
    if (!existsSync(PAPERS_INDEX)) return [];
    const parsed = parseYaml(readFileSync(PAPERS_INDEX, "utf-8"));
    if (!Array.isArray(parsed)) {
        throw new Error(`docs/papers/index.yaml is not a list`);
    }
    return (parsed as PaperEntry[]).map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors ?? [],
        year: p.year,
        venue: p.venue,
        cites: uniqSorted(p.cites ?? []),
    }));
}

function yamlList(values: string[]): string {
    if (values.length === 0) return "[]";
    return "[" + values.map((v) => JSON.stringify(v)).join(", ") + "]";
}

function escapeYamlString(s: string): string {
    // Wrap in double-quotes and escape backslashes + quotes.
    return JSON.stringify(s);
}

function wikilinkLine(slug: string): string {
    return `- [[${slug}]]`;
}

function renderPageStub(node: PageNode): string {
    const lines: string[] = [];
    lines.push("---");
    lines.push(`title: ${escapeYamlString(node.title)}`);
    lines.push(`type: ${node.type}`);
    lines.push(`slug: ${node.slug}`);
    lines.push("---");
    lines.push("");
    lines.push("> Generated stub — do not edit. Source: " +
        `\`content/${node.type === "algorithm" ? "algorithms" : node.type === "model" ? "models" : "concepts"}/${node.slug}.md\`.`);
    lines.push("");
    if (node.summary) {
        lines.push(node.summary);
        lines.push("");
    }
    if (node.prerequisites.length > 0) {
        lines.push("## Prerequisites");
        lines.push("");
        for (const s of node.prerequisites) lines.push(wikilinkLine(s));
        lines.push("");
    }
    if (node.relations.length > 0) {
        const byCategory = new Map<RelationCategory, TypedRelation[]>();
        for (const rel of node.relations) {
            const cat = RELATION_CATEGORY[rel.type];
            const list = byCategory.get(cat) ?? [];
            list.push(rel);
            byCategory.set(cat, list);
        }
        for (const cat of CATEGORY_ORDER) {
            const rels = byCategory.get(cat);
            if (!rels || rels.length === 0) continue;
            lines.push(`## ${cat}`);
            lines.push("");
            for (const rel of rels) {
                let line = `- **${RELATION_LABEL[rel.type]}** — [[${rel.target}]]`;
                if (rel.confidence !== "high") {
                    line += ` _(confidence: ${rel.confidence})_`;
                }
                lines.push(line);
                if (rel.caution) {
                    lines.push(`  > ${rel.caution}`);
                }
            }
            lines.push("");
        }
    }
    if (node.failureModes.length > 0) {
        lines.push("## Failure modes");
        lines.push("");
        for (const s of node.failureModes) lines.push(wikilinkLine(s));
        lines.push("");
    }
    if (node.sourcesPrimary || node.sourcesReferences.length > 0) {
        lines.push("## Sources");
        lines.push("");
        if (node.sourcesPrimary) {
            lines.push(`- Primary: [[${node.sourcesPrimary}]]`);
        }
        for (const s of node.sourcesReferences) {
            lines.push(`- Reference: [[${s}]]`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

function renderPaperStub(node: PaperNode): string {
    const lines: string[] = [];
    lines.push("---");
    lines.push(`title: ${escapeYamlString(node.title)}`);
    lines.push(`type: paper`);
    lines.push(`paper-id: ${node.id}`);
    if (node.year !== undefined) lines.push(`year: ${node.year}`);
    if (node.venue) lines.push(`venue: ${escapeYamlString(node.venue)}`);
    if (node.authors.length > 0) lines.push(`authors: ${yamlList(node.authors)}`);
    lines.push("---");
    lines.push("");
    lines.push(`> Generated stub — do not edit. Source: \`docs/papers/index.yaml\` (id: \`${node.id}\`).`);
    lines.push("");
    const meta: string[] = [];
    if (node.authors.length > 0) meta.push(node.authors.join(", "));
    if (node.year !== undefined) meta.push(String(node.year));
    if (node.venue) meta.push(node.venue);
    if (meta.length > 0) {
        lines.push(meta.join(" · "));
        lines.push("");
    }
    if (node.cites.length > 0) {
        lines.push("## Cites");
        lines.push("");
        for (const id of node.cites) lines.push(wikilinkLine(id));
        lines.push("");
    }
    return lines.join("\n");
}

function renderVaultReadme(counts: Record<NodeType, number>): string {
    return [
        "# Atlas vault",
        "",
        "**Generated artifact — do not edit by hand.** Source of truth lives in",
        "`content/algorithms/`, `content/models/`, `content/concepts/`, and",
        "`docs/papers/index.yaml`. Run `bun run vault:build` to regenerate.",
        "",
        "## Purpose",
        "",
        "An Obsidian-compatible projection of the atlas — every algorithm, model,",
        "concept, and paper is a stub `.md` whose body contains `[[wikilinks]]` for",
        "every forward edge (prerequisites, typed relations — grouped as Lineage /",
        "Practice / Cross-paradigm, failureModes, sources, paper→paper citations).",
        "Open this folder as a vault in Obsidian and use the graph view to look",
        "for clusters, gaps, and isolated islands.",
        "",
        "## Counts",
        "",
        `- Algorithms: ${counts.algorithm}`,
        `- Models: ${counts.model}`,
        `- Concepts: ${counts.concept}`,
        `- Papers: ${counts.paper}`,
        "",
        "## Conventions",
        "",
        "- Filenames are global slugs / paper IDs; wikilinks resolve by basename.",
        "- Forward edges only. Obsidian's backlinks panel shows the reverse view.",
        "- No author nodes — query authors with `grep` over",
        "  `docs/papers/index.yaml`.",
        "- Edits made in Obsidian do **not** flow back to source. Authoring goes",
        "  through the `algo-page`, `deep-model-page`, `concept-page`, and",
        "  `paper-ingest` skills.",
        "",
        "## Not deployed",
        "",
        "This folder is committed to the public GitHub repo for reproducibility,",
        "but is **not** part of the deployed site at vitavision.dev. The postbuild",
        "guard in `scripts/postbuild.ts` fails the build if any `docs/atlas-vault/`",
        "or `docs/research/` path leaks into `dist/`.",
        "",
    ].join("\n");
}

function clearDirContents(dir: string): void {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
        rmSync(join(dir, entry), { recursive: true, force: true });
    }
}

function ensureDir(dir: string): void {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function main(): void {
    const algorithms = readPages(join(CONTENT_DIR, "algorithms"), "algorithm");
    const models = readPages(join(CONTENT_DIR, "models"), "model");
    const concepts = readPages(join(CONTENT_DIR, "concepts"), "concept");
    const papers = readPapers();

    ensureDir(VAULT_DIR);
    clearDirContents(VAULT_DIR);

    const algoDir = join(VAULT_DIR, "algorithms");
    const modelDir = join(VAULT_DIR, "models");
    const conceptDir = join(VAULT_DIR, "concepts");
    const paperDir = join(VAULT_DIR, "papers");
    ensureDir(algoDir);
    ensureDir(modelDir);
    ensureDir(conceptDir);
    ensureDir(paperDir);

    for (const node of algorithms) {
        writeFileSync(join(algoDir, `${node.slug}.md`), renderPageStub(node), "utf-8");
    }
    for (const node of models) {
        writeFileSync(join(modelDir, `${node.slug}.md`), renderPageStub(node), "utf-8");
    }
    for (const node of concepts) {
        writeFileSync(join(conceptDir, `${node.slug}.md`), renderPageStub(node), "utf-8");
    }
    for (const node of papers) {
        writeFileSync(join(paperDir, `${node.id}.md`), renderPaperStub(node), "utf-8");
    }

    const counts: Record<NodeType, number> = {
        algorithm: algorithms.length,
        model: models.length,
        concept: concepts.length,
        paper: papers.length,
    };
    writeFileSync(join(VAULT_DIR, "README.md"), renderVaultReadme(counts), "utf-8");
    writeFileSync(join(VAULT_DIR, ".gitignore"), "/.obsidian/\n", "utf-8");

    const total = counts.algorithm + counts.model + counts.concept + counts.paper;
    console.log(
        `vault:build — ${counts.algorithm} algorithm(s), ${counts.model} model(s), ` +
        `${counts.concept} concept(s), ${counts.paper} paper(s) → ${VAULT_DIR} (${total} nodes)`,
    );
}

main();
