import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { join } from "node:path";
import { Feed } from "feed";
import { blogPosts, algorithmPages, demoPages, modelPages, conceptPages } from "../src/generated/content-index.ts";
import { blogHtmlLoaders } from "../src/generated/blog-loaders.ts";
import { algorithmHtmlLoaders } from "../src/generated/algorithm-loaders.ts";
import { demoHtmlLoaders } from "../src/generated/demo-loaders.ts";
import { modelHtmlLoaders } from "../src/generated/model-loaders.ts";
import { conceptHtmlLoaders } from "../src/generated/concept-loaders.ts";
import { render } from "../src/entry-server.tsx";
import type { StaticContentContextValue } from "../src/lib/content/ssr-content.tsx";
import type { PapersById } from "../src/generated/papers-index.ts";
import {
    buildAlgorithmJsonLd,
    buildBlogJsonLd,
    buildConceptJsonLd,
    buildDemoJsonLd,
    buildModelJsonLd,
    comparePublicationDateDesc,
    formatFeedTitle,
} from "../src/lib/content/publication.ts";

const DIST = join(import.meta.dir, "..", "dist");
const SITE_NAME = "VitaVision";
const SITE_URL = (process.env.SITE_URL ?? "https://vitavision.dev").replace(/\/+$/, "");

function readTemplate(): string {
    const templatePath = join(DIST, "index.html");
    if (!existsSync(templatePath)) {
        throw new Error(`dist/index.html not found. Run "bun run build" first.`);
    }
    return readFileSync(templatePath, "utf-8");
}

interface SeoMeta {
    title: string;
    description: string;
    ogType?: string;
    ogImage?: string;
    url?: string;
}

function buildHeadTags(meta: SeoMeta): string {
    const fullTitle = `${meta.title} | ${SITE_NAME}`;
    const twitterCard = meta.ogImage ? "summary_large_image" : "summary";
    const tags: string[] = [
        `<title>${esc(fullTitle)}</title>`,
        `<meta name="description" content="${esc(meta.description)}" />`,
        `<meta property="og:title" content="${esc(fullTitle)}" />`,
        `<meta property="og:description" content="${esc(meta.description)}" />`,
        `<meta property="og:type" content="${meta.ogType ?? "website"}" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        `<meta name="twitter:card" content="${twitterCard}" />`,
        `<meta name="twitter:title" content="${esc(fullTitle)}" />`,
        `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    ];
    if (meta.url) tags.push(`<meta property="og:url" content="${esc(meta.url)}" />`);
    if (meta.ogImage) {
        tags.push(`<meta property="og:image" content="${esc(meta.ogImage)}" />`);
        tags.push(`<meta name="twitter:image" content="${esc(meta.ogImage)}" />`);
    }
    return tags.join("\n    ");
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function writePage(
    template: string,
    url: string,
    outDir: string,
    meta: SeoMeta,
    staticContent: StaticContentContextValue,
    papers: PapersById,
    extraHead?: string,
): void {
    const html = render(url, staticContent, papers);
    let page = template.replace(
        '<div id="root"></div>',
        `<div id="root">${html}</div>`,
    );
    // Replace the generic <title> and inject SEO tags
    let headTags = buildHeadTags(meta);
    if (extraHead) headTags += `\n    ${extraHead}`;
    page = page.replace("<title>VitaVision</title>", headTags);
    const dir = join(DIST, outDir);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), page, "utf-8");
}

async function loadHtmlMap(
    loaders: Record<string, () => Promise<{ html: string }>>,
): Promise<Record<string, string>> {
    const entries = await Promise.all(
        Object.entries(loaders).map(async ([slug, load]) => {
            const mod = await load();
            return [slug, mod.html] as const;
        }),
    );

    return Object.fromEntries(entries);
}

function buildSitemap(paths: string[]): string {
    const urls = paths.map((p) => {
        const loc = `${SITE_URL}${p}`;
        return `  <url>\n    <loc>${esc(loc)}</loc>\n  </url>`;
    });
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        "</urlset>",
    ].join("\n");
}

async function main(): Promise<void> {
    const template = readTemplate();
    const staticContent: StaticContentContextValue = {
        blogHtmlBySlug: await loadHtmlMap(blogHtmlLoaders),
        algorithmHtmlBySlug: await loadHtmlMap(algorithmHtmlLoaders),
        demoHtmlBySlug: await loadHtmlMap(demoHtmlLoaders),
        modelHtmlBySlug: await loadHtmlMap(modelHtmlLoaders),
        conceptHtmlBySlug: await loadHtmlMap(conceptHtmlLoaders),
    };
    // Read the lazily-loaded papers index from disk so SSR can render the
    // SourceStrip on every prerendered page without an HTTP fetch.
    const papersJsonPath = join(import.meta.dir, "..", "public", "papers-index.json");
    const papers: PapersById = existsSync(papersJsonPath)
        ? (JSON.parse(readFileSync(papersJsonPath, "utf-8")) as PapersById)
        : {};
    let count = 0;

    // Blog index
    writePage(template, "/blog", "blog", {
        title: "Blog",
        description:
            "Articles on computer vision algorithms, calibration, and building intelligent systems.",
    }, staticContent, papers);
    count++;

    // Individual blog posts
    for (const post of blogPosts) {
        const { frontmatter } = post;
        const jsonLd = `<script type="application/ld+json">${JSON.stringify(buildBlogJsonLd(frontmatter, post.slug))}</script>`;
        writePage(template, `/blog/${post.slug}`, `blog/${post.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            ogImage: frontmatter.coverImage,
            url: `/blog/${post.slug}`,
        }, staticContent, papers, jsonLd);
        count++;
    }

    // Atlas index
    writePage(template, "/atlas", "atlas", {
        title: "Atlas",
        description: "Computer vision atlas — algorithms, models, and concepts.",
    }, staticContent, papers);
    count++;

    // Individual algorithm pages
    for (const page of algorithmPages) {
        const { frontmatter } = page;
        const jsonLd = `<script type="application/ld+json">${JSON.stringify(buildAlgorithmJsonLd(frontmatter, page.slug))}</script>`;
        writePage(template, `/atlas/${page.slug}`, `atlas/${page.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            ogImage: frontmatter.coverImage,
            url: `/atlas/${page.slug}`,
        }, staticContent, papers, jsonLd);
        count++;
    }

    // Demo index
    writePage(template, "/demos", "demos", {
        title: "Demos",
        description: "Interactive demos of computer vision algorithms.",
    }, staticContent, papers);
    count++;

    // Individual demo pages
    for (const demo of demoPages) {
        const { frontmatter } = demo;
        const jsonLd = `<script type="application/ld+json">${JSON.stringify(buildDemoJsonLd(frontmatter, demo.slug))}</script>`;
        writePage(template, `/demos/${demo.slug}`, `demos/${demo.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            url: `/demos/${demo.slug}`,
        }, staticContent, papers, jsonLd);
        count++;
    }

    // Individual model pages
    for (const model of modelPages) {
        const { frontmatter } = model;
        const jsonLd = `<script type="application/ld+json">${JSON.stringify(buildModelJsonLd(frontmatter, model.slug))}</script>`;
        writePage(template, `/atlas/${model.slug}`, `atlas/${model.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            ogImage: frontmatter.coverImage,
            url: `/atlas/${model.slug}`,
        }, staticContent, papers, jsonLd);
        count++;
    }

    // Individual concept pages
    for (const page of conceptPages) {
        const { frontmatter } = page;
        const jsonLd = `<script type="application/ld+json">${JSON.stringify(buildConceptJsonLd(frontmatter, page.slug))}</script>`;
        writePage(template, `/atlas/${page.slug}`, `atlas/${page.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            ogImage: frontmatter.coverImage,
            url: `/atlas/${page.slug}`,
        }, staticContent, papers, jsonLd);
        count++;
    }

    // Target generator
    writePage(template, "/tools/target-generator", "tools/target-generator", {
        title: "Target Generator",
        description: "Generate calibration targets — chessboard, ChArUco, marker board, ring grid — with SVG, PNG, DXF, and ZIP downloads.",
    }, staticContent, papers);
    count++;

    // Generate sitemap
    const sitemapPaths = [
        "/", "/blog", ...blogPosts.map((p) => `/blog/${p.slug}`),
        "/atlas",
        ...algorithmPages.map((p) => `/atlas/${p.slug}`),
        ...modelPages.map((m) => `/atlas/${m.slug}`),
        ...conceptPages.map((c) => `/atlas/${c.slug}`),
        "/demos", ...demoPages.map((d) => `/demos/${d.slug}`),
        "/tools/target-generator",
    ];
    writeFileSync(join(DIST, "sitemap.xml"), buildSitemap(sitemapPaths), "utf-8");

    // Generate RSS and Atom feeds
    const feed = new Feed({
        title: SITE_NAME,
        description: "Computer vision algorithms, interactive tools, and technical deep dives.",
        id: SITE_URL,
        link: SITE_URL,
        language: "en",
        copyright: `© ${new Date().getFullYear()} ${SITE_NAME}`,
        feedLinks: {
            rss2: `${SITE_URL}/rss.xml`,
            atom: `${SITE_URL}/atom.xml`,
        },
    });
    const feedEntries = [
        ...blogPosts.map((post) => ({ kind: "blog" as const, ...post })),
        ...algorithmPages.map((page) => ({ kind: "algorithm" as const, ...page })),
        ...demoPages.map((demo) => ({ kind: "demo" as const, ...demo })),
        ...modelPages.map((model) => ({ kind: "model" as const, ...model })),
        ...conceptPages.map((page) => ({ kind: "concept" as const, ...page })),
    ].sort(comparePublicationDateDesc);

    for (const entry of feedEntries) {
        const path = entry.kind === "blog"
            ? `/blog/${entry.slug}`
            : entry.kind === "demo"
                ? `/demos/${entry.slug}`
                : `/atlas/${entry.slug}`;
        const { frontmatter } = entry;
        feed.addItem({
            title: formatFeedTitle(entry.kind, frontmatter.title),
            id: `${SITE_URL}${path}`,
            link: `${SITE_URL}${path}`,
            description: frontmatter.summary,
            date: new Date(frontmatter.date),
            ...(frontmatter.author ? { author: [{ name: frontmatter.author }] } : {}),
            ...(frontmatter.coverImage && { image: frontmatter.coverImage }),
        });
    }
    writeFileSync(join(DIST, "rss.xml"), feed.rss2(), "utf-8");
    writeFileSync(join(DIST, "atom.xml"), feed.atom1(), "utf-8");

    // Copy content images to dist
    const contentImagesDir = join(import.meta.dir, "..", "content", "images");
    if (existsSync(contentImagesDir)) {
        const destDir = join(DIST, "content", "images");
        mkdirSync(destDir, { recursive: true });
        cpSync(contentImagesDir, destDir, { recursive: true });
        console.log(`postbuild: copied content/images/ → dist/content/images/`);
    }

    console.log(`postbuild: ${count} static page(s) + sitemap.xml + feeds generated in dist/`);
}

main().catch((err) => {
    console.error("postbuild failed:", err);
    process.exit(1);
});

// Validation guard: ensure no unpublished docs paths leaked into the public build.
// docs/research/ is the unpublished reasoning substrate; docs/atlas-vault/ is the
// generated Obsidian projection. Both are committed to GitHub but must never
// appear in dist/.
import { execSync } from "node:child_process";

const distDir = join(import.meta.dir, "..", "dist");
try {
    const result = execSync(
        `grep -rlE "docs/(research|atlas-vault)/" ${distDir} || true`,
        { encoding: "utf-8" },
    ).trim();
    if (result) {
        throw new Error(
            `Public build leaks unpublished-docs paths: ${result.split("\n").join(", ")}`,
        );
    }
} catch (err) {
    if (err instanceof Error && err.message.startsWith("Public build leaks")) throw err;
    // grep returned non-zero with no matches — that is the success path
}
