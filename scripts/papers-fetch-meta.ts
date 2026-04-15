import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..");
const INDEX_PATH = join(REPO_ROOT, "docs", "papers", "index.yaml");

const SKIP_WORDS = new Set([
    "the", "a", "an", "on", "of", "for", "in", "to", "by", "and", "with", "from",
]);

const OPENALEX_BASE = "https://api.openalex.org";

interface PaperEntry {
    id: string;
    title: string;
    arxiv?: string;
    doi?: string;
    cites?: string[];
}

interface OAIds {
    openalex?: string;
    doi?: string;
    mag?: string;
    pmid?: string;
    pmcid?: string;
}

interface OAAuthor {
    display_name: string;
}

interface OAAuthorship {
    author: OAAuthor;
}

interface OASource {
    display_name?: string;
}

interface OALocation {
    source?: OASource;
}

interface OAOpenAccess {
    oa_url?: string | null;
}

interface OAWork {
    id?: string;
    doi?: string | null;
    title?: string | null;
    publication_year?: number | null;
    publication_venue?: { display_name?: string } | null;
    host_venue?: { display_name?: string } | null;
    primary_location?: OALocation | null;
    authorships?: OAAuthorship[];
    open_access?: OAOpenAccess | null;
    referenced_works?: string[];
    ids?: OAIds;
}

interface RefInfo {
    oaUrl: string;
    doi?: string;
    arxiv?: string;
    title?: string;
    firstAuthorSlug?: string;
    year?: number;
}

function parseArg(arg: string): { kind: "arxiv" | "doi"; value: string } {
    if (arg.startsWith("arxiv:")) return { kind: "arxiv", value: arg.slice(6) };
    if (arg.startsWith("doi:")) return { kind: "doi", value: arg.slice(4) };
    if (/^\d{4}\.\d{4,5}$/.test(arg)) return { kind: "arxiv", value: arg };
    return { kind: "doi", value: arg };
}

function firstContentWord(title: string): string {
    const words = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 0);
    const word = words.find((w) => !SKIP_WORDS.has(w)) ?? words[0] ?? "unknown";
    return word.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function toAsciiSlug(s: string): string {
    return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function formatAuthor(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return name;
    const last = parts[parts.length - 1];
    const initials = parts
        .slice(0, -1)
        .map((p) => p[0].toUpperCase() + ".")
        .join(" ");
    return initials ? `${initials} ${last}` : last;
}

function lastNameSlug(name: string): string {
    const parts = name.trim().split(/\s+/);
    return toAsciiSlug(parts[parts.length - 1]);
}

function buildCandidateId(authorships: OAAuthorship[], year: number, title: string): string {
    const firstLast =
        authorships.length > 0
            ? lastNameSlug(authorships[0].author.display_name)
            : "unknown";
    const keyword = firstContentWord(title);
    return `${firstLast}${year}-${keyword}`;
}

function loadIndex(): PaperEntry[] {
    if (!existsSync(INDEX_PATH)) return [];
    const raw = readFileSync(INDEX_PATH, "utf-8");
    const parsed = parseYaml(raw);
    return Array.isArray(parsed) ? (parsed as PaperEntry[]) : [];
}

function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractArxivFromDoi(doi: string): string | undefined {
    const prefix = "10.48550/arxiv.";
    const lower = doi.toLowerCase();
    if (lower.startsWith(prefix)) return doi.slice(prefix.length);
    return undefined;
}

function oaWorkUrl(workUrl: string): string {
    return workUrl.replace("https://openalex.org/", "");
}

function matchRef(ref: RefInfo, index: PaperEntry[]): string | null {
    for (const entry of index) {
        if (ref.arxiv && entry.arxiv && ref.arxiv === entry.arxiv) return entry.id;
        if (ref.doi && entry.doi && entry.doi.toLowerCase() === ref.doi.toLowerCase()) return entry.id;
    }
    if (ref.title) {
        const normalizedRef = normalizeTitle(ref.title);
        for (const entry of index) {
            if (normalizeTitle(entry.title) === normalizedRef) return entry.id;
        }
    }
    return null;
}

function buildCitesYaml(refs: RefInfo[], index: PaperEntry[]): string[] {
    return refs.map((ref) => {
        const matched = matchRef(ref, index);
        if (matched) return `  - ${matched}`;

        const authorSlug = ref.firstAuthorSlug ?? "unknown";
        const year = ref.year ? String(ref.year) : "";
        const placeholder = `${authorSlug}${year}-???`;
        const titleComment = ref.title ? ` # unmatched: "${ref.title}"` : "";
        return `  - ${placeholder}${titleComment}`;
    });
}

function userAgent(): string {
    const email = process.env.OPENALEX_EMAIL;
    if (!email) {
        process.stderr.write(
            "papers:fetch-meta — OPENALEX_EMAIL not set; using default address. " +
            "Set OPENALEX_EMAIL=you@example.com to join the polite pool for higher rate limits.\n"
        );
        return "vitavision/0.1 (mailto:vitavision@example.invalid)";
    }
    return `vitavision/0.1 (mailto:${email})`;
}

async function fetchWork(url: string, ua: string): Promise<OAWork> {
    process.stderr.write(`Fetching ${url}\n`);
    const resp = await fetch(url, { headers: { "User-Agent": ua } });
    if (resp.status === 404) {
        process.stderr.write(`papers:fetch-meta — paper not found (404): ${url}\n`);
        process.exit(1);
    }
    if (!resp.ok) {
        process.stderr.write(`papers:fetch-meta — API error ${resp.status}: ${await resp.text()}\n`);
        process.exit(1);
    }
    return (await resp.json()) as OAWork;
}

async function batchFetchRefs(workUrls: string[], ua: string): Promise<RefInfo[]> {
    if (workUrls.length === 0) return [];

    const BATCH = 50;
    const results: RefInfo[] = [];

    for (let i = 0; i < workUrls.length; i += BATCH) {
        const batch = workUrls.slice(i, i + BATCH);
        const ids = batch.map(oaWorkUrl).join("|");
        const url = `${OPENALEX_BASE}/works?filter=openalex:${ids}&per-page=200&select=id,doi,title,publication_year,authorships,ids`;
        process.stderr.write(`Fetching references batch ${Math.floor(i / BATCH) + 1}: ${url}\n`);

        const resp = await fetch(url, { headers: { "User-Agent": ua } });
        if (!resp.ok) {
            process.stderr.write(`papers:fetch-meta — refs batch error ${resp.status}: ${await resp.text()}\n`);
            process.exit(1);
        }

        const data = (await resp.json()) as { results?: OAWork[] };
        const works = data.results ?? [];

        const byOaUrl = new Map<string, OAWork>();
        for (const w of works) {
            if (w.id) byOaUrl.set(w.id, w);
        }

        for (const origUrl of batch) {
            const w = byOaUrl.get(origUrl);
            if (!w) {
                results.push({ oaUrl: origUrl });
                continue;
            }
            const doi = w.doi ?? w.ids?.doi ?? undefined;
            const normDoi = doi ? doi.replace(/^https?:\/\/doi\.org\//i, "") : undefined;
            const arxiv = normDoi ? extractArxivFromDoi(normDoi) : undefined;
            const firstAuthorSlug =
                w.authorships && w.authorships.length > 0
                    ? lastNameSlug(w.authorships[0].author.display_name)
                    : undefined;
            results.push({
                oaUrl: origUrl,
                doi: normDoi,
                arxiv,
                title: w.title ?? undefined,
                firstAuthorSlug,
                year: w.publication_year ?? undefined,
            });
        }
    }

    return results;
}

function venueFrom(work: OAWork): string {
    return (
        work.publication_venue?.display_name ??
        work.host_venue?.display_name ??
        work.primary_location?.source?.display_name ??
        ""
    );
}

async function main(): Promise<void> {
    const arg = process.argv[2];
    if (!arg) {
        process.stderr.write("Usage: bun papers:fetch-meta <arxiv-id-or-doi>\n");
        process.exit(1);
    }

    const ua = userAgent();
    const { kind, value } = parseArg(arg);

    let primaryUrl: string;
    if (kind === "arxiv") {
        primaryUrl = `${OPENALEX_BASE}/works/doi:10.48550/arXiv.${value}`;
    } else {
        primaryUrl = `${OPENALEX_BASE}/works/doi:${value}`;
    }

    let work: OAWork;
    try {
        work = await fetchWork(primaryUrl, ua);
    } catch (err) {
        if (kind === "arxiv") {
            process.stderr.write(
                `papers:fetch-meta — could not retrieve arXiv:${value} via OpenAlex DOI lookup. ` +
                "Try providing a DOI directly (doi:<doi>).\n"
            );
        }
        throw err;
    }

    const title = work.title ?? "Unknown Title";
    const authorships: OAAuthorship[] = work.authorships ?? [];
    const year = work.publication_year ?? 0;
    const venue = venueFrom(work);

    const rawDoi = work.doi ?? undefined;
    const normDoi = rawDoi ? rawDoi.replace(/^https?:\/\/doi\.org\//i, "") : undefined;
    const arxivFromDoi = normDoi ? extractArxivFromDoi(normDoi) : undefined;
    const arxivId = arxivFromDoi ?? (kind === "arxiv" ? value : undefined);
    const doi = normDoi ?? (kind === "doi" ? value : undefined);

    const oaUrl = work.open_access?.oa_url ?? null;
    let pdfUrl: string;
    if (oaUrl) {
        pdfUrl = oaUrl;
    } else if (arxivId) {
        pdfUrl = `https://arxiv.org/pdf/${arxivId}v1`;
    } else {
        pdfUrl = "# TODO: paste url";
    }

    const candidateId = buildCandidateId(authorships, year, title);
    const formattedAuthors = authorships.map((a) => formatAuthor(a.author.display_name));

    const index = loadIndex();
    process.stderr.write(`Loaded ${index.length} entries from index.yaml\n`);

    const referencedWorkUrls: string[] = work.referenced_works ?? [];
    process.stderr.write(`Resolving ${referencedWorkUrls.length} referenced works\n`);

    const refs = await batchFetchRefs(referencedWorkUrls, ua);
    const citesLines = buildCitesYaml(refs, index);

    const lines: string[] = [];
    lines.push(`- id: ${candidateId}`);
    lines.push(`  title: "${title.replace(/"/g, '\\"')}"`);
    lines.push(`  authors: [${formattedAuthors.map((a) => `"${a}"`).join(", ")}]`);
    lines.push(`  year: ${year}`);
    if (venue) lines.push(`  venue: ${venue}`);
    lines.push(`  url: ${pdfUrl}`);
    if (arxivId) lines.push(`  arxiv: "${arxivId}"`);
    if (doi) lines.push(`  doi: "${doi}"`);
    lines.push(`  pdf: ${candidateId}.pdf`);
    if (citesLines.length > 0) {
        lines.push("  cites:");
        lines.push(...citesLines);
    } else {
        lines.push("  cites: []");
    }
    lines.push("  notes: # TODO: add notes");

    process.stdout.write(lines.join("\n") + "\n");
}

main().catch((err) => {
    process.stderr.write(`papers:fetch-meta error: ${err}\n`);
    process.exit(1);
});
