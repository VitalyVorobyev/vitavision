/**
 * Shared filesystem path constants for build/content scripts.
 *
 * Uses `dirname(fileURLToPath(import.meta.url))` (rather than Bun's
 * `import.meta.dir`) so these constants resolve correctly under both
 * `bun run` and vitest/Node — the latter is how scripts/lib/*.test.ts
 * exercises pure helpers that import from this module.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIB_DIR = dirname(fileURLToPath(import.meta.url));

/** Repository root (two levels up from scripts/lib/). */
export const REPO_ROOT = join(LIB_DIR, "..", "..");

export const CONTENT_DIR = join(REPO_ROOT, "content");
export const IMAGES_DIR = join(CONTENT_DIR, "images");

export const DOCS_DIR = join(REPO_ROOT, "docs");
export const PAPERS_DIR = join(DOCS_DIR, "papers");
export const PAPERS_INDEX_PATH = join(PAPERS_DIR, "index.yaml");
export const AUTHORS_YAML_PATH = join(PAPERS_DIR, "authors.yaml");
export const PAPERS_CACHE_DIR = join(PAPERS_DIR, ".cache");

export const RESEARCH_NOTES_DIR = join(DOCS_DIR, "research", "notes");
export const SOURCES_REPO_CACHE_DIR = join(DOCS_DIR, "sources", ".cache", "repo");
export const IMPLS_CACHE_DIR = join(DOCS_DIR, "impls", ".cache");
export const ATLAS_VAULT_DIR = join(DOCS_DIR, "atlas-vault");

export const GENERATED_DIR = join(REPO_ROOT, "src", "generated");
export const PUBLIC_DIR = join(REPO_ROOT, "public");
