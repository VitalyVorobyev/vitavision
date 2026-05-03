import { describe, expect, it } from "vitest";
import { atlasTiles, atlasTrails } from "./atlas-trails.ts";
import { algorithmPages, modelPages, conceptPages } from "../generated/content-index.ts";

interface MatchableEntry {
    slug: string;
    frontmatter: { title: string; tags: readonly string[]; category?: string; draft?: boolean };
}

function tileMatchCount(tile: (typeof atlasTiles)[number]): number {
    const { kind, categoryId, tags } = tile.apply;
    const sources: MatchableEntry[] = [];
    if (kind === "algorithm" || kind === undefined) {
        for (const e of algorithmPages) sources.push(e);
    }
    if (kind === "model" || kind === undefined) {
        for (const e of modelPages) sources.push(e);
    }
    if (kind === "concept" || kind === undefined) {
        for (const e of conceptPages) sources.push(e);
    }
    return sources.filter((e) => {
        if (e.frontmatter.draft) return false;
        if (categoryId && categoryId !== "all" && e.frontmatter.category !== categoryId) return false;
        if (tags && tags.length > 0) {
            return tags.every((t) => e.frontmatter.tags.includes(t));
        }
        return true;
    }).length;
}

describe("atlas-trails — tile validation", () => {
    for (const tile of atlasTiles) {
        it(`tile "${tile.id}" matches ≥3 published entries`, () => {
            const count = tileMatchCount(tile);
            expect(count, `tile "${tile.id}" should match ≥3 entries, got ${count}`).toBeGreaterThanOrEqual(3);
        });
    }
});

describe("atlas-trails — trail validation", () => {
    const allSlugs = new Set<string>([
        ...algorithmPages.map((p) => p.slug),
        ...modelPages.map((p) => p.slug),
        ...conceptPages.map((p) => p.slug),
    ]);

    const draftSlugs = new Set<string>([
        ...algorithmPages.filter((p) => p.frontmatter.draft).map((p) => p.slug),
        ...modelPages.filter((p) => p.frontmatter.draft).map((p) => p.slug),
        ...conceptPages.filter((p) => p.frontmatter.draft).map((p) => p.slug),
    ]);

    for (const trail of atlasTrails) {
        for (const slug of trail.steps) {
            it(`trail "${trail.id}" step "${slug}" exists`, () => {
                expect(allSlugs.has(slug), `slug "${slug}" not found in atlas`).toBe(true);
            });
            it(`trail "${trail.id}" step "${slug}" is non-draft`, () => {
                expect(draftSlugs.has(slug), `slug "${slug}" is a draft`).toBe(false);
            });
        }
    }
});
