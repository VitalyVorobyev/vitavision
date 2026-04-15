// Only GitHub repositories are supported. Raw file content is fetched from
// https://raw.githubusercontent.com/<owner>/<repo>/<sha>/<file>.
// Non-GitHub repo URLs are rejected with an error.

import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";
import matter from "gray-matter";

const REPO_ROOT = join(import.meta.dir, "..");
const CACHE_DIR = join(REPO_ROOT, "docs", "impls", ".cache");

interface ImplSources {
    repo: string;
    commit: string;
    files: string[];
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
    const cleaned = url.replace(/\.git$/, "");
    const match = cleaned.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
}

async function spawnAndWait(cmd: string[]): Promise<{ ok: boolean; stderr: string }> {
    const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
    const exitCode = await proc.exited;
    const stderrText = await new Response(proc.stderr).text();
    return { ok: exitCode === 0, stderr: stderrText.trim() };
}

async function main(): Promise<void> {
    const slug = process.argv[2];
    if (!slug) {
        process.stderr.write("Usage: bun impls:fetch <slug>\n");
        process.exit(1);
    }

    const mdPath = join(REPO_ROOT, "content", "algorithms", `${slug}.md`);
    if (!existsSync(mdPath)) {
        process.stderr.write(`impls:fetch — file not found: content/algorithms/${slug}.md\n`);
        process.exit(1);
    }

    const raw = readFileSync(mdPath, "utf-8");
    const { data } = matter(raw);

    const impl = (data.sources as Record<string, unknown> | undefined)?.impl as unknown;

    if (!impl || typeof impl !== "object") {
        process.stderr.write(`impls:fetch — missing sources.impl in ${slug}.md\n`);
        process.exit(1);
    }

    const implObj = impl as Record<string, unknown>;

    if (typeof implObj.repo !== "string") {
        process.stderr.write(`impls:fetch — sources.impl.repo must be a string in ${slug}.md\n`);
        process.exit(1);
    }
    if (typeof implObj.commit !== "string" || !/^[0-9a-f]{7,40}$/i.test(implObj.commit)) {
        process.stderr.write(`impls:fetch — sources.impl.commit must be a 7-40 hex string in ${slug}.md\n`);
        process.exit(1);
    }
    if (!Array.isArray(implObj.files) || implObj.files.length === 0) {
        process.stderr.write(`impls:fetch — sources.impl.files must be a non-empty array in ${slug}.md\n`);
        process.exit(1);
    }

    const sources: ImplSources = {
        repo: implObj.repo as string,
        commit: implObj.commit as string,
        files: implObj.files as string[],
    };

    const parsed = parseGitHubRepo(sources.repo);
    if (!parsed) {
        process.stderr.write(
            `impls:fetch — only GitHub repos are supported (got: ${sources.repo}). ` +
            `URL must match https://github.com/<owner>/<repo>\n`
        );
        process.exit(1);
    }

    const { owner, repo } = parsed;
    const sha = sources.commit;

    let ok = 0;
    let fail = 0;

    for (const file of sources.files) {
        const cachePath = join(CACHE_DIR, owner, repo, sha, file);

        if (existsSync(cachePath)) {
            console.log(`[cache] ${file}`);
            ok++;
            continue;
        }

        mkdirSync(dirname(cachePath), { recursive: true });

        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${file}`;
        const result = await spawnAndWait(["curl", "-fLsS", "-o", cachePath, rawUrl]);

        if (result.ok) {
            console.log(`[fetch] ${file}`);
            ok++;
        } else {
            console.log(`[error] ${file}: curl failed${result.stderr ? ": " + result.stderr : ""}`);
            fail++;
        }
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
    process.stderr.write(`impls:fetch error: ${err}\n`);
    process.exit(1);
});
