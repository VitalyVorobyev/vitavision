import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..");
const INDEX_PATH = join(REPO_ROOT, "docs", "papers", "index.yaml");
const CACHE_DIR = join(REPO_ROOT, "docs", "papers", ".cache");

interface PaperEntry {
    id: string;
    url: string;
    pdf?: string;
}

async function spawnAndWait(cmd: string[]): Promise<{ ok: boolean; stderr: string }> {
    const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
    const exitCode = await proc.exited;
    const stderrText = await new Response(proc.stderr).text();
    return { ok: exitCode === 0, stderr: stderrText.trim() };
}

async function fetchEntry(entry: PaperEntry): Promise<boolean> {
    const pdfName = entry.pdf ?? `${entry.id}.pdf`;
    const txtName = `${entry.id}.txt`;
    const pdfPath = join(CACHE_DIR, pdfName);
    const txtPath = join(CACHE_DIR, txtName);

    if (existsSync(pdfPath) && existsSync(txtPath)) {
        console.log(`[cache] ${entry.id}`);
        return true;
    }

    if (!existsSync(CACHE_DIR)) {
        mkdirSync(CACHE_DIR, { recursive: true });
    }

    if (!existsSync(pdfPath)) {
        const result = await spawnAndWait(["curl", "-fLsS", "-o", pdfPath, entry.url]);
        if (!result.ok) {
            console.log(`[error] ${entry.id}: curl failed${result.stderr ? ": " + result.stderr : ""}`);
            return false;
        }
    }

    if (!existsSync(txtPath)) {
        const result = await spawnAndWait(["pdftotext", "-layout", pdfPath, txtPath]);
        if (!result.ok) {
            console.log(`[error] ${entry.id}: pdftotext failed${result.stderr ? ": " + result.stderr : ""}`);
            return false;
        }
    }

    console.log(`[fetch] ${entry.id}`);
    return true;
}

async function main(): Promise<void> {
    const filterId = process.argv[2];

    const raw = readFileSync(INDEX_PATH, "utf-8");
    const entries = parseYaml(raw) as PaperEntry[];

    if (!Array.isArray(entries)) {
        process.stderr.write("papers:fetch — index.yaml is not a list\n");
        process.exit(1);
    }

    const targets = filterId ? entries.filter((e) => e.id === filterId) : entries;

    if (filterId && targets.length === 0) {
        process.stderr.write(`papers:fetch — id not found: ${filterId}\n`);
        process.exit(1);
    }

    let ok = 0;
    let fail = 0;

    for (const entry of targets) {
        const success = await fetchEntry(entry);
        if (success) ok++; else fail++;
    }

    const total = ok + fail;
    if (fail === 0) {
        process.stderr.write(`OK ${ok}/${total}\n`);
    } else {
        process.stderr.write(`FAIL ${ok}/${total}\n`);
        process.exit(1);
    }
}

main().catch((err) => {
    process.stderr.write(`papers:fetch error: ${err}\n`);
    process.exit(1);
});
