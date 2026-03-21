import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { join } from "node:path";
import { Feed } from "feed";
import { blogPosts, algorithmPages } from "../src/generated/content-manifest.ts";
import { render } from "../src/entry-server.tsx";

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
        `<title>${fullTitle}</title>`,
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

interface BlogPostingMeta {
    title: string;
    description: string;
    author: string;
    datePublished: string;
    dateModified?: string;
    image?: string;
    keywords?: string;
}

function buildJsonLd(meta: BlogPostingMeta): string {
    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: meta.title,
        description: meta.description,
        datePublished: meta.datePublished,
        author: { "@type": "Person", name: meta.author },
    };
    if (meta.dateModified) data.dateModified = meta.dateModified;
    if (meta.image) data.image = meta.image;
    if (meta.keywords) data.keywords = meta.keywords;
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function writePage(template: string, url: string, outDir: string, meta: SeoMeta, extraHead?: string): void {
    const html = render(url);
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

function main(): void {
    const template = readTemplate();
    let count = 0;

    // Blog index
    writePage(template, "/blog", "blog", {
        title: "Blog",
        description:
            "Articles on computer vision algorithms, calibration, and building intelligent systems.",
    });
    count++;

    // Individual blog posts
    for (const post of blogPosts) {
        const { frontmatter } = post;
        const jsonLd = buildJsonLd({
            title: frontmatter.title,
            description: frontmatter.summary,
            author: frontmatter.author,
            datePublished: frontmatter.date,
            dateModified: frontmatter.updated,
            image: frontmatter.coverImage,
            keywords: frontmatter.tags.join(", "),
        });
        writePage(template, `/blog/${post.slug}`, `blog/${post.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            ogImage: frontmatter.coverImage,
            url: `/blog/${post.slug}`,
        }, jsonLd);
        count++;
    }

    // Algorithm index
    writePage(template, "/algorithms", "algorithms", {
        title: "Algorithms",
        description: "Computer vision algorithms — explore, understand, and experiment.",
    });
    count++;

    // Individual algorithm pages
    for (const page of algorithmPages) {
        const { frontmatter } = page;
        writePage(template, `/algorithms/${page.slug}`, `algorithms/${page.slug}`, {
            title: frontmatter.title,
            description: frontmatter.summary,
            ogType: "article",
            url: `/algorithms/${page.slug}`,
        });
        count++;
    }

    // Target generator
    writePage(template, "/tools/target-generator", "tools/target-generator", {
        title: "Target Generator",
        description: "Generate calibration targets — chessboard, ChArUco, marker board, ring grid — with SVG, PNG, DXF, and ZIP downloads.",
    });
    count++;

    // Generate sitemap
    const sitemapPaths = [
        "/", "/blog", ...blogPosts.map((p) => `/blog/${p.slug}`),
        "/algorithms", ...algorithmPages.map((p) => `/algorithms/${p.slug}`),
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
    for (const post of blogPosts) {
        const { frontmatter } = post;
        feed.addItem({
            title: frontmatter.title,
            id: `${SITE_URL}/blog/${post.slug}`,
            link: `${SITE_URL}/blog/${post.slug}`,
            description: frontmatter.summary,
            date: new Date(frontmatter.date),
            author: [{ name: frontmatter.author }],
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

main();
