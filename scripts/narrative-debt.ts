/**
 * Narrative "page debt" report.
 *
 * Scans every published (non-draft) narrative under content/narratives/ for
 * paper-only nodes — papers cited in a narrative that have no atlas page yet
 * — and prints a markdown table for pasting into docs/atlas/roadmap.md.
 *
 * Run: bun run scripts/narrative-debt.ts
 * Set INCLUDE_DRAFTS=true to also scan draft narratives.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";

import { narrativeFrontmatterSchema } from "../src/lib/content/schema.ts";

const REPO_ROOT = join(import.meta.dir, "..");
const CONTENT_DIR = join(REPO_ROOT, "content");
const NARRATIVES_DIR = join(CONTENT_DIR, "narratives");
const PAPERS_INDEX = join(REPO_ROOT, "docs", "papers", "index.yaml");

interface PaperIndexEntry {
    id: string;
    kind?: "paper" | "repo" | "doc";
    title?: string;
}

function loadPaperTitles(): Map<string, string> {
    const titles = new Map<string, string>();
    if (!existsSync(PAPERS_INDEX)) return titles;
    const raw = readFileSync(PAPERS_INDEX, "utf-8");
    const entries = parseYaml(raw) as PaperIndexEntry[] | null;
    if (!Array.isArray(entries)) return titles;
    for (const e of entries) {
        if (!e.id) continue;
        const kind = e.kind ?? "paper";
        if (kind !== "paper") continue;
        titles.set(e.id, e.title ?? e.id);
    }
    return titles;
}

interface DebtRow {
    paperId: string;
    paperTitle: string;
    nodeIds: Set<string>;
    narrativeSlugs: Set<string>;
}

function main(): void {
    const includeDrafts = process.env.INCLUDE_DRAFTS === "true";
    const paperTitles = loadPaperTitles();

    const debt = new Map<string, DebtRow>();

    if (existsSync(NARRATIVES_DIR)) {
        const files = readdirSync(NARRATIVES_DIR).filter((f) => f.endsWith(".md"));
        for (const file of files) {
            const raw = readFileSync(join(NARRATIVES_DIR, file), "utf-8");
            const { data } = matter(raw);
            const slug = file.replace(/\.md$/, "");

            let fm: { draft?: boolean; nodes: { id: string; paper?: string }[] };
            try {
                fm = narrativeFrontmatterSchema.parse(data) as typeof fm;
            } catch (err) {
                console.error(`narratives:debt — skipping ${file}: frontmatter parse error: ${String(err)}`);
                continue;
            }

            if (fm.draft && !includeDrafts) continue;

            for (const node of fm.nodes) {
                if (!node.paper) continue;
                let row = debt.get(node.paper);
                if (!row) {
                    row = {
                        paperId: node.paper,
                        paperTitle: paperTitles.get(node.paper) ?? node.paper,
                        nodeIds: new Set(),
                        narrativeSlugs: new Set(),
                    };
                    debt.set(node.paper, row);
                }
                row.nodeIds.add(node.id);
                row.narrativeSlugs.add(slug);
            }
        }
    }

    const rows = [...debt.values()].sort((a, b) => a.paperId.localeCompare(b.paperId));

    if (rows.length === 0) {
        console.log("narratives:debt — no paper-only ('page debt') nodes found.");
        return;
    }

    const lines: string[] = [
        "| paper | node | narrative(s) | suggested page kind |",
        "| --- | --- | --- | --- |",
        ...rows.map((r) => {
            const paperCol = `\`${r.paperId}\` — ${r.paperTitle}`;
            const nodeCol = [...r.nodeIds].sort().join(", ");
            const narrativeCol = [...r.narrativeSlugs].sort().join(", ");
            return `| ${paperCol} | ${nodeCol} | ${narrativeCol} | model or concept |`;
        }),
    ];

    console.log(lines.join("\n"));
}

main();
