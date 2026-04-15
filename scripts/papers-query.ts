import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import matter from "gray-matter";

const REPO_ROOT = join(import.meta.dir, "..");
const INDEX_PATH = join(REPO_ROOT, "docs", "papers", "index.yaml");
const ALGO_DIR = join(REPO_ROOT, "content", "algorithms");

interface PaperEntry {
    id: string;
    title: string;
    cites?: string[];
}

interface AlgoSources {
    primary?: string;
    references?: string[];
}

function loadIndex(): PaperEntry[] {
    if (!existsSync(INDEX_PATH)) {
        process.stderr.write("papers:query — docs/papers/index.yaml not found\n");
        process.exit(1);
    }
    const raw = readFileSync(INDEX_PATH, "utf-8");
    const parsed = parseYaml(raw);
    if (!Array.isArray(parsed)) {
        process.stderr.write("papers:query — index.yaml is not a list\n");
        process.exit(1);
    }
    return parsed as PaperEntry[];
}

function queryCites(id: string, index: PaperEntry[]): void {
    const entry = index.find((e) => e.id === id);
    if (!entry) {
        process.stderr.write(`papers:query — id not found: ${id}\n`);
        process.exit(1);
    }
    for (const cited of entry.cites ?? []) {
        process.stdout.write(cited + "\n");
    }
}

function queryCitedBy(id: string, index: PaperEntry[]): void {
    for (const entry of index) {
        if (entry.cites?.includes(id)) {
            process.stdout.write(entry.id + "\n");
        }
    }
}

function queryPagesUsing(id: string): void {
    if (!existsSync(ALGO_DIR)) return;

    const files = readdirSync(ALGO_DIR).filter((f) => f.endsWith(".md"));

    for (const file of files) {
        const raw = readFileSync(join(ALGO_DIR, file), "utf-8");
        const { data } = matter(raw);
        const sources = data.sources as AlgoSources | undefined;
        if (!sources) continue;

        const usesId =
            sources.primary === id ||
            (Array.isArray(sources.references) && sources.references.includes(id));

        if (usesId) {
            process.stdout.write(`content/algorithms/${file}\n`);
        }
    }
}

function main(): void {
    const relation = process.argv[2];
    const id = process.argv[3];

    if (!relation || !id) {
        process.stderr.write(
            "Usage: bun papers:query <relation> <id>\n" +
            "Relations: cites, cited-by, pages-using\n"
        );
        process.exit(1);
    }

    const index = loadIndex();

    switch (relation) {
        case "cites":
            queryCites(id, index);
            break;
        case "cited-by":
            queryCitedBy(id, index);
            break;
        case "pages-using":
            queryPagesUsing(id);
            break;
        default:
            process.stderr.write(
                `papers:query — unknown relation: ${relation}\n` +
                "Relations: cites, cited-by, pages-using\n"
            );
            process.exit(1);
    }
}

main();
