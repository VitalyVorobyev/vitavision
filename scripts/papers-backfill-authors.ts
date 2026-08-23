// scripts/papers-backfill-authors.ts
//
// One-off batch backfill: resolves OpenAlex author identities for every
// paper entry in docs/papers/index.yaml that doesn't have `authorIds` yet,
// and proposes/writes docs/papers/authors.yaml.
//
// Usage:
//   bun run scripts/papers-backfill-authors.ts --dry-run   # preview only
//   bun run scripts/papers-backfill-authors.ts --write     # apply changes
//
// Reuses the auth/UA/batching patterns from scripts/papers-fetch-meta.ts.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..");
const INDEX_PATH = join(REPO_ROOT, "docs", "papers", "index.yaml");
const AUTHORS_PATH = join(REPO_ROOT, "docs", "papers", "authors.yaml");
const SCRATCHPAD_DIFF_PATH =
    "/private/tmp/claude-501/-Users-vitalyvorobyev-vitavision/0d93d848-543b-4501-9e97-21300eb3b4eb/scratchpad/authors-backfill-dryrun.txt";

const OPENALEX_BASE = "https://api.openalex.org";
const DOI_BATCH = 50;
const SLEEP_MS = 150;

interface PaperEntry {
    id: string;
    title: string;
    kind?: string;
    doi?: string;
    year?: number;
    authorIds?: string[];
}

interface OAAuthor {
    id?: string;
    display_name: string;
    orcid?: string | null;
}

interface OAAuthorship {
    author: OAAuthor;
}

interface OAWork {
    id?: string;
    doi?: string | null;
    title?: string | null;
    publication_year?: number | null;
    authorships?: OAAuthorship[];
}

interface AuthorIdentity {
    name: string;
    orcid?: string;
}

interface ResolvedEntry {
    entry: PaperEntry;
    authorIds: string[];
    matchedBy: "doi" | "title";
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function userAgent(): string {
    const email = process.env.OPENALEX_EMAIL;
    if (!email) {
        process.stderr.write(
            "papers:backfill-authors — OPENALEX_EMAIL not set; using default address. " +
            "Set OPENALEX_EMAIL=you@example.com to join the polite pool for higher rate limits.\n"
        );
        return "vitavision/0.1 (mailto:vitavision@example.invalid)";
    }
    return `vitavision/0.1 (mailto:${email})`;
}

function withAuth(url: string): string {
    const apiKey = process.env.OPENALEX_API_KEY;
    if (!apiKey) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}api_key=${encodeURIComponent(apiKey)}`;
}

function normalizeDoi(doi: string): string {
    return doi.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase();
}

function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function bareAuthorId(authorUrl: string): string {
    return authorUrl.replace(/^https?:\/\/openalex\.org\//i, "");
}

function bareOrcid(orcidUrl: string): string {
    return orcidUrl.replace(/^https?:\/\/orcid\.org\//i, "");
}

function authorIdsFromWork(work: OAWork): string[] {
    return (work.authorships ?? [])
        .map((a) => (a.author.id ? bareAuthorId(a.author.id) : undefined))
        .filter((id): id is string => !!id);
}

function recordAuthors(work: OAWork, identities: Map<string, AuthorIdentity>): void {
    for (const a of work.authorships ?? []) {
        if (!a.author.id) continue;
        const id = bareAuthorId(a.author.id);
        if (identities.has(id)) continue;
        const identity: AuthorIdentity = { name: a.author.display_name };
        if (a.author.orcid) identity.orcid = bareOrcid(a.author.orcid);
        identities.set(id, identity);
    }
}

function loadIndex(): { raw: string; entries: PaperEntry[] } {
    const raw = readFileSync(INDEX_PATH, "utf-8");
    const parsed = parseYaml(raw);
    const entries = Array.isArray(parsed) ? (parsed as PaperEntry[]) : [];
    return { raw, entries };
}

async function fetchDoiBatch(dois: string[], ua: string): Promise<OAWork[]> {
    const filterValue = dois.join("|");
    const url =
        `${OPENALEX_BASE}/works?filter=doi:${encodeURIComponent(filterValue)}` +
        `&per-page=${DOI_BATCH}&select=id,doi,title,publication_year,authorships`;
    process.stderr.write(`Fetching DOI batch (${dois.length} dois)\n`);
    const resp = await fetch(withAuth(url), { headers: { "User-Agent": ua } });
    if (!resp.ok) {
        process.stderr.write(`papers:backfill-authors — DOI batch error ${resp.status}: ${await resp.text()}\n`);
        return [];
    }
    const data = (await resp.json()) as { results?: OAWork[] };
    return data.results ?? [];
}

async function fetchByTitleYear(title: string, year: number | undefined, ua: string): Promise<OAWork | null> {
    const yearFilter = year !== undefined ? `,publication_year:${year}` : "";
    const url =
        `${OPENALEX_BASE}/works?filter=title.search:${encodeURIComponent(title)}${yearFilter}` +
        `&select=id,doi,title,publication_year,authorships&per-page=1`;
    process.stderr.write(`Fetching by title/year: "${title}" (${year ?? "any year"})\n`);
    const resp = await fetch(withAuth(url), { headers: { "User-Agent": ua } });
    if (!resp.ok) {
        process.stderr.write(`papers:backfill-authors — title search error ${resp.status}: ${await resp.text()}\n`);
        return null;
    }
    const data = (await resp.json()) as { results?: OAWork[] };
    return data.results?.[0] ?? null;
}

function parseArgs(): "dry-run" | "write" {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const write = args.includes("--write");
    if (dryRun && write) {
        process.stderr.write("papers:backfill-authors — pass exactly one of --dry-run or --write, not both.\n");
        process.exit(1);
    }
    if (!dryRun && !write) {
        process.stderr.write(
            "papers:backfill-authors — refusing to run without --dry-run or --write.\n" +
            "Usage: bun run scripts/papers-backfill-authors.ts --dry-run\n" +
            "       bun run scripts/papers-backfill-authors.ts --write\n"
        );
        process.exit(1);
    }
    return dryRun ? "dry-run" : "write";
}

// Locates, for a given entry id, the 0-based line index of that entry's
// `  authors:` line in the raw index.yaml text. Scans forward from the
// entry's `- id: <id>` line until the next `- id:` line or the authors line.
function findAuthorsLineIndex(lines: string[], entryId: string): number | null {
    const idLineRe = new RegExp(`^- id:\\s+${entryId}\\s*$`);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (idLineRe.test(lines[i])) {
            start = i;
            break;
        }
    }
    if (start === -1) return null;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^- id:\s/.test(lines[i])) return null; // hit next entry, no authors: line found
        if (/^\s*authors:/.test(lines[i])) return i;
    }
    return null;
}

function formatAuthorsYaml(identities: Map<string, AuthorIdentity>): string {
    const header = [
        "# docs/papers/authors.yaml — registry of author identities (OpenAlex ids).",
        "#",
        "# Generated by scripts/papers-backfill-authors.ts. Referenced from paper",
        "# entries in docs/papers/index.yaml via their `authorIds:` field.",
        "# Hand-edit for corrections (mangled display names, missing/wrong orcid).",
        "",
    ].join("\n");

    const sorted = [...identities.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
    const stanzas = sorted.map(([id, identity]) => {
        const nameEsc = identity.name.replace(/"/g, '\\"');
        const lines = [`- id: ${id}`, `  name: "${nameEsc}"`];
        if (identity.orcid) lines.push(`  orcid: "${identity.orcid}"`);
        return lines.join("\n");
    });

    return `${header}\n${stanzas.join("\n\n")}\n`;
}

function formatDiffHunk(entry: PaperEntry, authorsLineIndex: number, lines: string[]): string {
    const insertLine = `  authorIds: [${entry.authorIds!.join(", ")}]`;
    const before = lines[authorsLineIndex];
    const after = authorsLineIndex + 1 < lines.length ? lines[authorsLineIndex + 1] : "";
    return [
        `@@ ${entry.id} @@`,
        `   ${before}`,
        `+  ${insertLine.trimStart()}`,
        after ? `   ${after}` : "",
    ].filter((l) => l !== "").join("\n");
}

async function main(): Promise<void> {
    const mode = parseArgs();
    const ua = userAgent();
    const { raw, entries } = loadIndex();

    const candidates = entries.filter(
        (e) => e.kind !== "repo" && e.kind !== "doc" && !(e.authorIds && e.authorIds.length > 0)
    );
    process.stderr.write(
        `Loaded ${entries.length} index entries; ${candidates.length} candidates for author backfill.\n`
    );

    const identities = new Map<string, AuthorIdentity>();
    const resolved: ResolvedEntry[] = [];
    const unresolvedIds: string[] = [];
    let matchedByDoi = 0;
    let matchedByTitle = 0;

    // --- Pass 1: batch-resolve entries with a DOI ---
    const withDoi = candidates.filter((e) => !!e.doi);
    const doiToEntry = new Map<string, PaperEntry>();
    for (const e of withDoi) doiToEntry.set(normalizeDoi(e.doi!), e);

    const doiList = [...doiToEntry.keys()];
    const matchedDoiEntryIds = new Set<string>();

    for (let i = 0; i < doiList.length; i += DOI_BATCH) {
        const batch = doiList.slice(i, i + DOI_BATCH);
        const works = await fetchDoiBatch(batch, ua);
        for (const w of works) {
            const workDoi = w.doi ? normalizeDoi(w.doi) : undefined;
            if (!workDoi) continue;
            const entry = doiToEntry.get(workDoi);
            if (!entry) continue;
            // OpenAlex occasionally has duplicate/merged work records sharing a
            // DOI (e.g. two records for the same arXiv preprint). Keep only the
            // first match per entry so downstream output stays 1:1.
            if (matchedDoiEntryIds.has(entry.id)) {
                process.stderr.write(
                    `NOTE: duplicate OpenAlex work for DOI ${workDoi} (entry ${entry.id}); keeping first match, ignoring "${w.title}".\n`
                );
                continue;
            }
            const authorIds = authorIdsFromWork(w);
            if (authorIds.length === 0) continue;
            recordAuthors(w, identities);
            resolved.push({ entry, authorIds, matchedBy: "doi" });
            matchedDoiEntryIds.add(entry.id);
            matchedByDoi++;
        }
        if (i + DOI_BATCH < doiList.length) await sleep(SLEEP_MS);
    }

    // --- Pass 2: title+year fallback for everything else ---
    const remaining = candidates.filter((e) => !matchedDoiEntryIds.has(e.id));
    for (const entry of remaining) {
        const top = await fetchByTitleYear(entry.title, entry.year, ua);
        await sleep(SLEEP_MS);
        if (!top || !top.title) {
            process.stderr.write(`UNRESOLVED (no result): ${entry.id} — "${entry.title}"\n`);
            unresolvedIds.push(entry.id);
            continue;
        }
        if (normalizeTitle(top.title) !== normalizeTitle(entry.title)) {
            process.stderr.write(
                `UNRESOLVED (title mismatch): ${entry.id} — expected "${entry.title}", top result "${top.title}"\n`
            );
            unresolvedIds.push(entry.id);
            continue;
        }
        const authorIds = authorIdsFromWork(top);
        if (authorIds.length === 0) {
            process.stderr.write(`UNRESOLVED (no author ids on matched work): ${entry.id}\n`);
            unresolvedIds.push(entry.id);
            continue;
        }
        recordAuthors(top, identities);
        resolved.push({ entry, authorIds, matchedBy: "title" });
        matchedByTitle++;
    }

    // Attach authorIds onto the in-memory entries for downstream formatting.
    for (const r of resolved) r.entry.authorIds = r.authorIds;

    const summary = [
        `Papers matched by DOI:    ${matchedByDoi}`,
        `Papers matched by title:  ${matchedByTitle}`,
        `Unresolved:               ${unresolvedIds.length}${unresolvedIds.length ? " — " + unresolvedIds.join(", ") : ""}`,
        `Distinct authors found:   ${identities.size}`,
    ].join("\n");

    if (mode === "dry-run") {
        const lines = raw.split("\n");
        const hunks: string[] = [];
        for (const r of resolved) {
            const idx = findAuthorsLineIndex(lines, r.entry.id);
            if (idx === null) {
                process.stderr.write(`Could not locate 'authors:' line for ${r.entry.id}; skipping preview hunk.\n`);
                continue;
            }
            hunks.push(formatDiffHunk(r.entry, idx, lines));
        }

        const authorsYaml = formatAuthorsYaml(identities);

        const output = [
            "=== docs/papers/index.yaml — proposed authorIds insertions ===",
            "",
            hunks.join("\n\n"),
            "",
            "=== docs/papers/authors.yaml — proposed full content ===",
            "",
            authorsYaml,
            "=== Summary ===",
            "",
            summary,
            "",
        ].join("\n");

        process.stdout.write(output);
        writeFileSync(SCRATCHPAD_DIFF_PATH, output, "utf-8");
        process.stderr.write(`\nFull dry-run preview written to ${SCRATCHPAD_DIFF_PATH}\n`);
        return;
    }

    // --- --write: line-based surgery on index.yaml ---
    const backup = raw;
    const lines = raw.split("\n");

    // Compute insertion points before mutating, then apply from the bottom up
    // so earlier indices stay valid.
    const insertions: { lineIndex: number; text: string }[] = [];
    for (const r of resolved) {
        const idx = findAuthorsLineIndex(lines, r.entry.id);
        if (idx === null) {
            process.stderr.write(
                `WARNING: could not locate 'authors:' line for ${r.entry.id}; skipping this entry's authorIds insertion.\n`
            );
            continue;
        }
        // `authors:` may be a block-style list (item lines indented deeper than
        // the key); insert after the last continuation line, not after the key
        // itself, or the inserted line splits the block and breaks the YAML.
        let end = idx;
        while (end + 1 < lines.length && /^\s{4,}\S/.test(lines[end + 1])) {
            end++;
        }
        insertions.push({ lineIndex: end, text: `  authorIds: [${r.authorIds.join(", ")}]` });
    }
    insertions.sort((a, b) => b.lineIndex - a.lineIndex);

    for (const ins of insertions) {
        lines.splice(ins.lineIndex + 1, 0, ins.text);
    }

    const newRaw = lines.join("\n");

    // Sanity check: re-parse and confirm entry count is unchanged.
    let parsedOk = false;
    try {
        const reparsed = parseYaml(newRaw);
        if (Array.isArray(reparsed) && reparsed.length === entries.length) {
            parsedOk = true;
        } else {
            process.stderr.write(
                `SANITY CHECK FAILED: entry count changed (${entries.length} -> ` +
                `${Array.isArray(reparsed) ? reparsed.length : "not-an-array"}).\n`
            );
        }
    } catch (err) {
        process.stderr.write(`SANITY CHECK FAILED: index.yaml no longer parses: ${err}\n`);
    }

    if (!parsedOk) {
        process.stderr.write("Aborting write; index.yaml left unchanged.\n");
        // backup === original content; nothing was written to disk yet, so no
        // restore is needed, but keep the variable for clarity/future-proofing.
        void backup;
        process.exit(1);
    }

    writeFileSync(INDEX_PATH, newRaw, "utf-8");
    writeFileSync(AUTHORS_PATH, formatAuthorsYaml(identities), "utf-8");

    process.stderr.write(
        `Wrote ${insertions.length} authorIds insertions to ${INDEX_PATH}\n` +
        `Wrote ${identities.size} author identities to ${AUTHORS_PATH}\n`
    );
    process.stdout.write(summary + "\n");
}

main().catch((err) => {
    process.stderr.write(`papers:backfill-authors error: ${err}\n`);
    process.exit(1);
});
