// sources-fetch-repo.ts
// Fetches GitHub repo metadata + README + LICENSE for every `kind: repo` entry
// in docs/papers/index.yaml and emits a stub research note.
//
// No LLM calls. Fully deterministic and idempotent.
// Usage:  bun run sources:fetch-repo [<source-id>]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..");
const INDEX_PATH = join(REPO_ROOT, "docs", "papers", "index.yaml");
const CACHE_BASE = join(REPO_ROOT, "docs", "sources", ".cache", "repo");
const NOTES_DIR = join(REPO_ROOT, "docs", "research", "notes");

// ── Types ─────────────────────────────────────────────────────────────────────

interface RepoEntry {
    id: string;
    kind: "repo";
    title?: string;
    repo: string;
    commit: string;
    license?: string;
    description?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
    const cleaned = url.replace(/\.git$/, "");
    const match = cleaned.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
}

async function spawnCapture(
    cmd: string[],
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;
    const stdoutText = await new Response(proc.stdout).text();
    const stderrText = await new Response(proc.stderr).text();
    return { ok: exitCode === 0, stdout: stdoutText, stderr: stderrText.trim() };
}

/** Try a list of raw.githubusercontent.com paths; return [path, content] for the first 200. */
async function fetchFirstExisting(
    owner: string,
    repo: string,
    commit: string,
    candidates: string[],
): Promise<[string, string] | null> {
    for (const candidate of candidates) {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${candidate}`;
        const res = await fetch(url);
        if (res.ok) {
            return [candidate, await res.text()];
        }
    }
    return null;
}

/** Fetch GitHub API JSON (unauthed or via GITHUB_TOKEN). */
async function fetchGitHubApi(path: string): Promise<Record<string, unknown> | null> {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const url = `https://api.github.com${path}`;
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        return (await res.json()) as Record<string, unknown>;
    } catch {
        return null;
    }
}

/** Verify commit pin via git ls-remote (best-effort, non-fatal). */
async function verifyCommitPin(
    id: string,
    repoUrl: string,
    commit: string,
): Promise<void> {
    const result = await spawnCapture(["git", "ls-remote", repoUrl]);
    if (!result.ok) {
        // ls-remote failed entirely — likely network; don't block
        console.log(`[warn] ${id}: git ls-remote failed (non-fatal)`);
        return;
    }
    const found = result.stdout.split("\n").some((line) => line.startsWith(commit));
    if (!found) {
        console.log(
            `[warn] ${id}: commit pin ${commit} not found in ls-remote (may still exist as detached commit)`,
        );
    }
}

// ── Note generation ────────────────────────────────────────────────────────────

function buildStubNote(entry: RepoEntry, today: string): string {
    const repoField = entry.repo;
    const parsed = parseGitHubRepo(repoField)!;
    const titleStr = entry.title ?? `${parsed.owner}/${parsed.repo}`;

    return [
        `---`,
        `source_id: ${entry.id}`,
        `kind: repo`,
        `title: "${titleStr}"`,
        `repo: ${repoField}`,
        `commit: ${entry.commit}`,
        `license: ${entry.license ?? "unknown"}`,
        `created: ${today}`,
        `relevant_atlas_pages: []`,
        `---`,
        ``,
        `# Repository scope`,
        ``,
        `# Architecture`,
        ``,
        `# Failure regime`,
        ``,
        `# Maintenance signal`,
        ``,
        `# Applicability`,
        ``,
        `# Connections`,
        ``,
        `# Atlas update plan`,
        ``,
        `# Provenance`,
        ``,
    ].join("\n");
}

// ── Per-entry processing ───────────────────────────────────────────────────────

async function processEntry(
    entry: RepoEntry,
    today: string,
): Promise<{ cacheHit: boolean; stubCreated: boolean; error: boolean }> {
    const { id, repo: repoUrl, commit } = entry;

    // Validate repo URL format
    const parsed = parseGitHubRepo(repoUrl);
    if (!parsed) {
        console.log(`[error] ${id}: malformed repo or commit — repo URL must be https://github.com/<owner>/<repo>`);
        return { cacheHit: false, stubCreated: false, error: true };
    }

    // Validate commit format (7-40 hex)
    if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
        console.log(`[error] ${id}: malformed repo or commit — commit must be 7-40 hex characters`);
        return { cacheHit: false, stubCreated: false, error: true };
    }

    const { owner, repo } = parsed;
    const cacheDir = join(CACHE_BASE, owner, repo, commit);
    const metaPath = join(cacheDir, "meta.json");
    const readmePath = join(cacheDir, "README.md");
    const licensePath = join(cacheDir, "LICENSE");

    const allCached = existsSync(metaPath) && existsSync(readmePath) && existsSync(licensePath);

    if (allCached) {
        console.log(`[cache] ${id}`);
    } else {
        // Verify commit pin (non-fatal)
        await verifyCommitPin(id, repoUrl, commit);

        mkdirSync(cacheDir, { recursive: true });

        // Fetch GitHub API metadata
        const meta = await fetchGitHubApi(`/repos/${owner}/${repo}`);
        if (meta) {
            writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
        } else {
            // Write an empty sentinel so we don't re-attempt on every run
            writeFileSync(metaPath, "{}", "utf-8");
            console.log(`[warn] ${id}: GitHub API fetch failed (meta.json written as {})`);
        }

        // Fetch README
        const readmeCandidates = ["README.md", "README.rst", "README"];
        const readmeResult = await fetchFirstExisting(owner, repo, commit, readmeCandidates);
        if (readmeResult) {
            writeFileSync(readmePath, readmeResult[1], "utf-8");
        } else {
            writeFileSync(readmePath, "", "utf-8");
            console.log(`[warn] ${id}: README not found at pinned commit (wrote empty file)`);
        }

        // Fetch LICENSE
        const licenseCandidates = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"];
        const licenseResult = await fetchFirstExisting(owner, repo, commit, licenseCandidates);
        if (licenseResult) {
            writeFileSync(licensePath, licenseResult[1], "utf-8");
        } else {
            writeFileSync(licensePath, "", "utf-8");
            console.log(`[warn] ${id}: LICENSE not found at pinned commit (wrote empty file)`);
        }

        console.log(`[fetch] ${id}`);
    }

    // Emit stub note (create-only)
    const notePath = join(NOTES_DIR, `${id}.md`);
    let stubCreated = false;
    if (existsSync(notePath)) {
        console.log(`[ok] ${id}`);
    } else {
        const stub = buildStubNote(entry, today);
        writeFileSync(notePath, stub, "utf-8");
        console.log(`[stub] ${id}`);
        stubCreated = true;
    }

    return { cacheHit: allCached, stubCreated, error: false };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const filterId = process.argv[2];

    if (!existsSync(INDEX_PATH)) {
        process.stderr.write("sources:fetch-repo — index.yaml not found\n");
        process.exit(1);
    }

    const raw = readFileSync(INDEX_PATH, "utf-8");
    const allEntries = parseYaml(raw) as Array<Record<string, unknown>>;

    if (!Array.isArray(allEntries)) {
        process.stderr.write("sources:fetch-repo — index.yaml is not a list\n");
        process.exit(1);
    }

    // Filter to kind: repo entries
    const repoEntries = allEntries
        .filter((e) => e.kind === "repo")
        .map((e) => e as unknown as RepoEntry);

    if (repoEntries.length === 0) {
        console.log("no repo entries found");
        console.log("repos: 0, stubs: 0, cache hits: 0, errors: 0");
        return;
    }

    const targets = filterId
        ? repoEntries.filter((e) => e.id === filterId)
        : repoEntries;

    if (filterId && targets.length === 0) {
        process.stderr.write(`sources:fetch-repo — id not found: ${filterId}\n`);
        process.exit(1);
    }

    // Ensure notes dir exists
    mkdirSync(NOTES_DIR, { recursive: true });

    const today = new Date().toISOString().split("T")[0];

    let cacheHits = 0;
    let stubs = 0;
    let errors = 0;

    for (const entry of targets) {
        const result = await processEntry(entry, today);
        if (result.error) {
            errors++;
        } else {
            if (result.cacheHit) cacheHits++;
            if (result.stubCreated) stubs++;
        }
    }

    const total = targets.length;
    console.log(`repos: ${total}, stubs: ${stubs}, cache hits: ${cacheHits}, errors: ${errors}`);

    if (errors > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    process.stderr.write(`sources:fetch-repo error: ${err}\n`);
    process.exit(1);
});
