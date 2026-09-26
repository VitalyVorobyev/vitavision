/**
 * GitHub-repo helpers shared across impls-fetch.ts, sources-fetch-repo.ts,
 * and papers-fetch.ts. Runs under Bun only (`Bun.spawn`) — these scripts are
 * always invoked via `bun run`, never imported from a vitest/Node context.
 */

/** Parses a `https://github.com/<owner>/<repo>[.git]` URL. Returns null for
 *  anything else (only GitHub HTTPS repo URLs are supported). */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
    const cleaned = url.replace(/\.git$/, "");
    const match = cleaned.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
}

/** Spawns `cmd`, discarding stdout, and waits for exit. Used for fire-and-check
 *  subprocess calls (curl, pdftotext) where only success/failure + stderr matter. */
export async function spawnAndWait(cmd: string[]): Promise<{ ok: boolean; stderr: string }> {
    const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
    const exitCode = await proc.exited;
    const stderrText = await new Response(proc.stderr).text();
    return { ok: exitCode === 0, stderr: stderrText.trim() };
}
