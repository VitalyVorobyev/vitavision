/**
 * Slug helpers and a shared markdown-directory loader for content/** pages.
 *
 * All content kinds derive their slug from the filename by stripping the
 * `.md` extension; blog posts additionally strip a leading `YYYY-MM-DD-`
 * date prefix.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import matter from "gray-matter";

export type ContentKind = "algorithm" | "model" | "concept" | "narrative" | "demo" | "blog";

function stripMdExt(filename: string): string {
    return basename(filename, ".md");
}

/** Derives a page's slug from its filename, per content kind. */
export function slugFromFile(kind: ContentKind, filename: string): string {
    const base = stripMdExt(filename);
    if (kind === "blog") {
        return base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    }
    return base;
}

export function algoSlug(filename: string): string {
    return slugFromFile("algorithm", filename);
}
export function modelSlug(filename: string): string {
    return slugFromFile("model", filename);
}
export function conceptSlug(filename: string): string {
    return slugFromFile("concept", filename);
}
export function narrativeSlug(filename: string): string {
    return slugFromFile("narrative", filename);
}
export function demoSlug(filename: string): string {
    return slugFromFile("demo", filename);
}
export function blogSlug(filename: string): string {
    return slugFromFile("blog", filename);
}

export interface MarkdownDirEntry {
    file: string;
    slug: string;
    data: Record<string, unknown>;
    content: string;
}

/**
 * Reads every `.md` file directly under `dir`, gray-matter-parses it, and
 * derives its slug via `slugFn`. Returns `[]` when `dir` does not exist.
 *
 * This is the read-and-parse step only — callers that need to mutate `data`
 * (e.g. validate-content.ts backfilling `readingTimeMinutes` when absent) do
 * so on the returned entries, since `data` is a plain mutable object.
 */
export function loadMarkdownDir(dir: string, slugFn: (filename: string) => string): MarkdownDirEntry[] {
    if (!existsSync(dir)) return [];
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    return files.map((file) => {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data, content } = matter(raw);
        return { file, slug: slugFn(file), data, content };
    });
}
