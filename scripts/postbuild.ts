import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { blogPosts } from "../src/generated/content-manifest.ts";
import { render } from "../src/entry-server.tsx";

const DIST = join(import.meta.dir, "..", "dist");

function readTemplate(): string {
    const templatePath = join(DIST, "index.html");
    if (!existsSync(templatePath)) {
        throw new Error(`dist/index.html not found. Run "bun run build" first.`);
    }
    return readFileSync(templatePath, "utf-8");
}

function writePage(template: string, url: string, outDir: string): void {
    const html = render(url);
    const page = template.replace(
        '<div id="root"></div>',
        `<div id="root">${html}</div>`,
    );
    const dir = join(DIST, outDir);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), page, "utf-8");
}

function main(): void {
    const template = readTemplate();
    let count = 0;

    // Blog index
    writePage(template, "/blog", "blog");
    count++;

    // Individual blog posts
    for (const post of blogPosts) {
        writePage(template, `/blog/${post.slug}`, `blog/${post.slug}`);
        count++;
    }

    console.log(`postbuild: ${count} static page(s) generated in dist/`);
}

main();
