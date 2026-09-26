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
import { join } from "node:path";

import { narrativeFrontmatterSchema } from "../src/lib/content/schema.ts";
import { CONTENT_DIR } from "./lib/paths.ts";
import { loadIndexEntries, paperTitles as papersIndexTitles } from "./lib/papers-index.ts";
import { loadMarkdownDir, narrativeSlug } from "./lib/content-kinds.ts";

const NARRATIVES_DIR = join(CONTENT_DIR, "narratives");

function loadPaperTitles(): Map<string, string> {
    return papersIndexTitles(loadIndexEntries(undefined, { onMissing: () => [] }));
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

    for (const { file, slug, data } of loadMarkdownDir(NARRATIVES_DIR, narrativeSlug)) {
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
