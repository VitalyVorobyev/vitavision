/**
 * One-shot migration script: replaces `category:` with `domain:` in all
 * published algorithm, model, and concept pages.
 *
 * Run with:  bun run scripts/apply-category-migration.ts
 *
 * For 02-demo-blocks (dev: true): removes category line, does NOT add domain.
 * For all others: adds `domain: <value>` immediately after the removed `category:` line.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..");
const CONTENT_DIR = join(REPO_ROOT, "content");

// ── Migration table ───────────────────────────────────────────────────────────
// slug → new domain value (or null for dev:true pages — remove category only)
const DOMAIN_MAP: Record<string, string | null> = {
    // algorithms
    "02-demo-blocks":                    null,        // dev:true — remove category, no domain
    "apap-image-stitching":              "stitching", // OVERRIDE: source category was wrong
    "chess-corners":                     "features",
    "daniilidis-dual-quaternion-handeye":"calibration",
    "duda-radon-corners":                "features",
    "fast-corner-detector":              "features",
    "fundamental-matrix-eight-point":    "geometry",
    "gao-dual-homography-stitching":     "stitching",
    "geiger-chessboard-detector":        "features",
    "gp-checkerboard-enhancement":       "calibration",
    "harris-corner-detector":            "features",
    "kumar-generalized-rac":             "calibration",
    "laureano-topological-chessboard":   "targets",
    "lin-sva-stitching":                 "stitching",
    "ocpad":                             "targets",
    "puzzleboard":                       "targets",
    "pyramidal-blur-aware-xcorner":      "features",
    "rochade":                           "targets",
    "shi-tomasi-corner-detector":        "features",
    "shu-topological-grid":              "targets",
    "sturm-plane-based-calibration":     "calibration",
    "tsai-lenz-handeye":                 "calibration",
    "tsai-versatile-calibration":        "calibration",
    "zhang-planar-calibration":          "calibration",
    // concepts
    "camera-distortion-models":          "image-formation",
    "chessboard-x-corner-detection":     "features",
    "dlt-normalisation":                 "geometry",
    "epipolar-geometry":                 "geometry",
    "hessian-saddle-response":           "features",
    "homography":                        "geometry",
    "image-gradient":                    "features",
    "scale-space":                       "image-formation",
    "spatially-varying-image-stitching": "geometry",
    "structure-tensor":                  "features",
    "topological-grid-recovery":         "features",
    // models
    "ccdn-checkerboard-detector":        "calibration",
    "mate-checkerboard-detector":        "calibration",
    "superpoint":                        "features",
    "xfeat":                             "features",    // OVERRIDE: XFeat is a feature detector
};

function slugFromFilename(filename: string): string {
    return filename.replace(/\.md$/, "");
}

/**
 * Rewrite a single file: replace `category: <old>` with `domain: <new>`
 * (or just remove `category:` for dev:true pages).
 *
 * Uses raw string replacement on the YAML frontmatter text to preserve
 * all other whitespace and field ordering exactly.
 */
function processFile(filePath: string, slug: string): void {
    const raw = readFileSync(filePath, "utf-8");

    // Find the YAML frontmatter block (between the first pair of --- markers).
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
        console.warn(`  SKIP ${slug}: no frontmatter block found`);
        return;
    }

    const frontmatterText = match[1];

    // Check if there is a category: line.
    const categoryMatch = frontmatterText.match(/^(category:\s*.+)$/m);
    if (!categoryMatch) {
        console.warn(`  SKIP ${slug}: no category: line found`);
        return;
    }

    const categoryLine = categoryMatch[1];
    const newDomain = DOMAIN_MAP[slug];

    let newFrontmatter: string;
    if (newDomain === null) {
        // dev:true page — remove category line entirely, no domain added.
        newFrontmatter = frontmatterText.replace(categoryLine + "\n", "");
        // Handle case where category is the last line (no trailing newline after it).
        if (newFrontmatter === frontmatterText) {
            newFrontmatter = frontmatterText.replace("\n" + categoryLine, "");
        }
        console.log(`  ${slug}: removed category (dev:true, no domain added)`);
    } else {
        // Normal page — replace category with domain.
        newFrontmatter = frontmatterText.replace(categoryLine, `domain: ${newDomain}`);
        console.log(`  ${slug}: category → domain: ${newDomain}`);
    }

    const newRaw = raw.replace(match[0], `---\n${newFrontmatter}\n---`);
    writeFileSync(filePath, newRaw, "utf-8");
}

function processDirectory(dir: string): void {
    if (!existsSync(dir)) return;
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
        const slug = slugFromFilename(file);
        if (!(slug in DOMAIN_MAP)) {
            // Not in migration table — skip silently (e.g. blog posts in content/blog).
            continue;
        }
        processFile(join(dir, file), slug);
    }
}

console.log("apply-category-migration: starting...\n");
processDirectory(join(CONTENT_DIR, "algorithms"));
processDirectory(join(CONTENT_DIR, "models"));
processDirectory(join(CONTENT_DIR, "concepts"));
console.log("\napply-category-migration: done.");
