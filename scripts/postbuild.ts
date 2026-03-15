import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { blogPosts } from "../src/generated/content-manifest.ts";
import { render } from "../src/entry-server.tsx";

const DIST = join(import.meta.dir, "..", "dist");
const SITE_NAME = "VitaVision";

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

function writePage(template: string, url: string, outDir: string, meta: SeoMeta): void {
    const html = render(url);
    let page = template.replace(
        '<div id="root"></div>',
        `<div id="root">${html}</div>`,
    );
    // Replace the generic <title> and inject SEO tags
    const headTags = buildHeadTags(meta);
    page = page.replace("<title>VitaVision</title>", headTags);
    const dir = join(DIST, outDir);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), page, "utf-8");
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
        writePage(template, `/blog/${post.slug}`, `blog/${post.slug}`, {
            title: post.frontmatter.title,
            description: post.frontmatter.summary,
            ogType: "article",
            ogImage: post.frontmatter.coverImage,
            url: `/blog/${post.slug}`,
        });
        count++;
    }

    console.log(`postbuild: ${count} static page(s) generated in dist/`);
}

main();
