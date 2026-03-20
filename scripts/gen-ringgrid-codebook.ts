/**
 * One-time script to convert public/codebook.rs hex arrays into JSON files
 * for the ringgrid target generator.
 *
 * Usage: bun run scripts/gen-ringgrid-codebook.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = join(import.meta.dir, "..", "public", "codebook.rs");
const OUT_DIR = join(import.meta.dir, "..", "public", "ringgrid");

function extractArray(src: string, name: string): number[] {
  // Match: pub const NAME: [u16; N] = [ ... ];
  const re = new RegExp(
    `pub\\s+const\\s+${name}\\s*:\\s*\\[u16;\\s*\\d+\\]\\s*=\\s*\\[([\\s\\S]*?)\\];`,
  );
  const m = src.match(re);
  if (!m) throw new Error(`Could not find array ${name}`);
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((hex) => parseInt(hex, 16));
}

const src = readFileSync(SRC, "utf-8");

const baseline = extractArray(src, "CODEBOOK");
const extended = extractArray(src, "CODEBOOK_EXTENDED");

console.log(`Baseline: ${baseline.length} codes`);
console.log(`Extended: ${extended.length} codes`);

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(
  join(OUT_DIR, "codebook_baseline.json"),
  JSON.stringify({ bits: 16, minCyclicDist: 2, codes: baseline }) + "\n",
);

writeFileSync(
  join(OUT_DIR, "codebook_extended.json"),
  JSON.stringify({ bits: 16, minCyclicDist: 1, codes: extended }) + "\n",
);

console.log(`Wrote ${OUT_DIR}/codebook_baseline.json`);
console.log(`Wrote ${OUT_DIR}/codebook_extended.json`);
