/**
 * Content validation script.
 * Validates frontmatter with Zod, checks image references exist,
 * and checks internal blog links resolve to known slugs.
 *
 * Exit code 1 on any validation failure.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import matter from "gray-matter";

import {
    blogFrontmatterSchema,
    algorithmFrontmatterSchema,
} from "../src/lib/content/schema.ts";
import type { ZodType, ZodError } from "zod";

const CONTENT_DIR = join(import.meta.dir, "..", "content");
const IMAGES_DIR = join(CONTENT_DIR, "images");

let errors = 0;

function error(file: string, msg: string): void {
    console.error(`  ERROR [${file}]: ${msg}`);
    errors++;
}

function warn(file: string, msg: string): void {
    console.warn(`  WARN  [${file}]: ${msg}`);
}

function blogSlug(filename: string): string {
    return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function listMdFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => f.endsWith(".md"));
}

function validateFrontmatter<T>(
    dir: string,
    files: string[],
    schema: ZodType<T>,
    label: string,
): { file: string; data: Record<string, unknown>; content: string }[] {
    const results: { file: string; data: Record<string, unknown>; content: string }[] = [];

    for (const file of files) {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data, content } = matter(raw);
        try {
            schema.parse(data);
        } catch (e) {
            const zodErr = e as ZodError;
            for (const issue of zodErr.issues) {
                error(file, `${label} frontmatter: ${issue.path.join(".")} — ${issue.message}`);
            }
        }
        results.push({ file, data, content });
    }

    return results;
}

function checkImageReferences(
    file: string,
    content: string,
): void {
    // Match markdown image syntax: ![alt](path)
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(content)) !== null) {
        const src = match[1];
        // Only check relative image references
        if (src.startsWith("./images/") || src.startsWith("../images/")) {
            const imageName = src.replace(/^\.{1,2}\/images\//, "");
            const imagePath = join(IMAGES_DIR, imageName);
            if (!existsSync(imagePath)) {
                error(file, `image not found: ${src} (expected at content/images/${imageName})`);
            }
        }
    }

    // Also check HTML img tags in markdown
    const htmlImgRegex = /src="(\.{1,2}\/images\/[^"]+)"/g;
    while ((match = htmlImgRegex.exec(content)) !== null) {
        const src = match[1];
        const imageName = src.replace(/^\.{1,2}\/images\//, "");
        const imagePath = join(IMAGES_DIR, imageName);
        if (!existsSync(imagePath)) {
            error(file, `image not found: ${src} (expected at content/images/${imageName})`);
        }
    }
}

function checkMissingAltText(file: string, content: string): void {
    const emptyAltRegex = /!\[\]\(/g;
    let match: RegExpExecArray | null;
    while ((match = emptyAltRegex.exec(content)) !== null) {
        warn(file, `image at offset ${match.index} has empty alt text`);
    }
}

function checkInternalLinks(
    file: string,
    content: string,
    knownBlogSlugs: Set<string>,
): void {
    // Match markdown links: [text](/blog/slug)
    const linkRegex = /\[[^\]]*\]\(\/blog\/([a-z0-9-]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(content)) !== null) {
        const slug = match[1];
        if (!knownBlogSlugs.has(slug)) {
            error(file, `broken internal link: /blog/${slug} (slug not found)`);
        }
    }
}

function main(): void {
    console.log("content:validate — checking content...\n");

    // Collect blog files
    const blogDir = join(CONTENT_DIR, "blog");
    const blogFiles = listMdFiles(blogDir);
    const blogEntries = validateFrontmatter(blogDir, blogFiles, blogFrontmatterSchema, "blog");

    // Collect algorithm files
    const algoDir = join(CONTENT_DIR, "algorithms");
    const algoFiles = listMdFiles(algoDir);
    validateFrontmatter(algoDir, algoFiles, algorithmFrontmatterSchema, "algorithm");

    // Build known blog slugs
    const knownBlogSlugs = new Set(blogFiles.map(blogSlug));

    // Check image references and internal links
    for (const entry of blogEntries) {
        checkImageReferences(entry.file, entry.content);
        checkMissingAltText(entry.file, entry.content);
        checkInternalLinks(entry.file, entry.content, knownBlogSlugs);
    }

    // Summary
    const totalFiles = blogFiles.length + algoFiles.length;
    if (errors > 0) {
        console.error(`\ncontent:validate — ${errors} error(s) in ${totalFiles} file(s)`);
        process.exit(1);
    } else {
        console.log(`content:validate — ${totalFiles} file(s) validated, no errors`);
    }
}

main();
