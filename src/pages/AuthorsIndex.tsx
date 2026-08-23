import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import SeoHead from "../components/seo/SeoHead.tsx";
import OrcidLink from "../components/atlas/OrcidLink.tsx";
import { useAuthorsIndex } from "../lib/atlas/useAuthorsIndex.ts";
import {
    buildAuthorRows,
    compareByName,
    compareByPaperCount,
    groupByInitial,
    type AuthorRow,
} from "../lib/atlas/authorStats.ts";

type SortMode = "name" | "papers";

function matches(row: AuthorRow, needle: string): boolean {
    if (!needle) return true;
    return row.name.toLowerCase().includes(needle) || row.sortKey.includes(needle);
}

function AuthorListRow({ row }: { row: AuthorRow }) {
    return (
        <li className="flex items-baseline gap-2 py-1 border-b border-[hsl(var(--border)/0.4)] last:border-b-0">
            <Link
                to={`/authors/${row.id}`}
                className="text-[13.5px] text-foreground hover:text-primary transition-colors"
            >
                {row.name}
            </Link>
            {row.orcid && <OrcidLink orcid={row.orcid} />}
            <span className="flex-1" />
            <span className="text-[11.5px] font-mono text-muted-foreground whitespace-nowrap tabular-nums">
                {row.paperCount} paper{row.paperCount === 1 ? "" : "s"} · {row.pageCount} page
                {row.pageCount === 1 ? "" : "s"}
            </span>
        </li>
    );
}

/**
 * Unlisted register of every author credited on a paper in the atlas source
 * index. Not linked from the navbar — reached from source bylines and by URL.
 */
export default function AuthorsIndex() {
    const index = useAuthorsIndex();
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortMode>("name");

    const rows = useMemo(() => buildAuthorRows(index), [index]);
    const needle = query.trim().toLowerCase();

    const filtered = useMemo(
        () => rows.filter((r) => matches(r, needle)).sort(sort === "name" ? compareByName : compareByPaperCount),
        [rows, needle, sort],
    );
    const groups = useMemo(
        () => (sort === "name" ? groupByInitial(filtered) : [{ letter: "", rows: filtered }]),
        [filtered, sort],
    );

    return (
        <div className="max-w-[880px] mx-auto py-12 px-4 lg:px-8 animate-in fade-in">
            <SeoHead
                title="Authors"
                description="Every researcher credited on a paper cited by the VitaVision computer vision atlas."
                url="/authors"
            />

            <div className="flex items-baseline justify-between gap-4 mb-1">
                <h1 className="text-[22px] font-bold -tracking-[0.4px]">
                    Authors{" "}
                    <span className="text-muted-foreground font-normal text-[15px] ml-1.5">
                        {rows.length}
                    </span>
                </h1>

                <div className="flex items-center gap-2.5">
                    <div className="w-[200px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--bg-soft))]">
                        <Search size={13} className="shrink-0 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Filter authors…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-xs placeholder:text-muted-foreground text-foreground min-w-0"
                        />
                    </div>

                    <div className="flex rounded-md border border-[hsl(var(--border)/0.7)] overflow-hidden text-xs">
                        {(["name", "papers"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setSort(mode)}
                                aria-pressed={sort === mode}
                                className={`px-2.5 py-1.5 transition-colors ${
                                    sort === mode
                                        ? "bg-[hsl(var(--bg-soft))] text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {mode === "name" ? "A–Z" : "Papers"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <p className="text-[13px] text-muted-foreground mb-6">
                Everyone credited on a paper cited by the atlas.
            </p>

            {filtered.length === 0 ? (
                <p className="text-[13px] text-muted-foreground py-8">
                    {rows.length === 0 ? "Loading the author register…" : `No author matches “${query}”.`}
                </p>
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <section key={group.letter || "all"}>
                            {group.letter && (
                                <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                                    {group.letter}
                                </h2>
                            )}
                            <ul className="list-none p-0 m-0">
                                {group.rows.map((row) => (
                                    <AuthorListRow key={row.id} row={row} />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
