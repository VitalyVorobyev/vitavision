/**
 * Rule: image references, for every content kind (blog, demos, algorithms,
 * models, concepts, narratives).
 *
 * Ported from the old scripts/content-validate.ts's `checkImageReferences`
 * and `checkMissingAltText`, generalized from blog+algorithm to
 * `ctx.bodyEntries` (all six kinds). Images are authored as
 * `images/<subdir>/<file>` (optionally `./images/...` or `../images/...`) —
 * see scripts/build/render.ts's `resolveContentImagePaths`, which rewrites
 * that same prefix to `/content/images/...` at build time.
 */
import type { Diagnostic, ValidationContext } from "../types.ts";

const SUPPORTED_CONTENT_IMAGE_PREFIX = /^(?:\.{1,2}\/)?images\//;
const ABSOLUTE_OR_EXTERNAL = /^(?:[a-z]+:|\/|#|data:)/i;

function validateImageSrc(
    diagnostics: Diagnostic[],
    ctx: ValidationContext,
    file: string,
    src: string,
): void {
    if (SUPPORTED_CONTENT_IMAGE_PREFIX.test(src)) {
        const imageName = src.replace(SUPPORTED_CONTENT_IMAGE_PREFIX, "");
        if (!ctx.imageExists(imageName)) {
            diagnostics.push({
                level: "error",
                message: `[${file}] image not found: ${src} (expected at content/images/${imageName})`,
            });
        }
        return;
    }

    if (!ABSOLUTE_OR_EXTERNAL.test(src)) {
        diagnostics.push({
            level: "error",
            message: `[${file}] unsupported relative image path: ${src} (use ./images/... or images/...)`,
        });
    }
}

export function imagesRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const e of ctx.bodyEntries) {
        const content = e.content;

        // Markdown image syntax: ![alt](path)
        const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
        let match: RegExpExecArray | null;
        while ((match = imgRegex.exec(content)) !== null) {
            validateImageSrc(diagnostics, ctx, e.file, match[1]);
        }

        // HTML <img src="..."> tags in markdown.
        const htmlImgRegex = /<img\b[^>]*?\ssrc=["']([^"']+)["']/gi;
        while ((match = htmlImgRegex.exec(content)) !== null) {
            validateImageSrc(diagnostics, ctx, e.file, match[1]);
        }

        // Empty alt text — warning only.
        const emptyAltRegex = /!\[\]\(/g;
        while ((match = emptyAltRegex.exec(content)) !== null) {
            diagnostics.push({
                level: "warning",
                message: `[${e.file}] image at offset ${match.index} has empty alt text`,
            });
        }
    }

    return diagnostics;
}
