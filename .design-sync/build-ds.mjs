// Pre-bundles the design-system entry into a single ESM file for /design-sync.
//
// Why this exists: the repo's root tsconfig.json is a solution file ("files": [],
// only project references), so it carries no `compilerOptions.jsx`. esbuild
// discovers that root tsconfig when it walks up from src/**, falls back to the
// CLASSIC JSX transform, and emits React.createElement calls into components
// that never import React — every card would throw "React is not defined".
//
// Bundling here with an explicit `jsx: 'automatic'` settles the transform before
// the converter ever sees the code: it receives plain ESM with no JSX left.
//
// Run via the `buildCmd` in .design-sync/config.json.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

// ── Stylesheet ───────────────────────────────────────────────────────────
// Vite emits the compiled Tailwind sheet with ROOT-ABSOLUTE font urls
// (`url(/assets/inter-….woff2)`). The converter resolves url() relative to the
// stylesheet, so those never resolve — every @font-face ships dangling and all
// 117 font files silently fail to copy, leaving designs in a fallback font.
// Rewriting them to `../assets/` and writing the sheet next to dist/assets
// makes them resolvable, so the fonts travel with the bundle.
mkdirSync(join(REPO, 'dist/ds'), { recursive: true });
const assets = join(REPO, 'dist/assets');
const cssName = readdirSync(assets).find((f) => f.endsWith('.css'));
if (!cssName) {
    console.error('! no compiled .css in dist/assets — run `npx vite build` first');
    process.exit(1);
}
const css = readFileSync(join(assets, cssName), 'utf8').replaceAll('url(/assets/', 'url(../assets/');
writeFileSync(join(REPO, 'dist/ds/styles.css'), css);
console.log(`  styles.css <- dist/assets/${cssName} (${Math.round(css.length / 1024)} KB, font urls rewritten)`);

const result = await build({
    entryPoints: [join(HERE, 'ds-entry.tsx')],
    outfile: join(REPO, 'dist/ds/index.mjs'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    // react/react-dom stay external — the converter maps them onto the
    // window.React / window.ReactDOM globals the preview cards provide.
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    loader: { '.svg': 'dataurl', '.png': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl' },
    define: { 'process.env.NODE_ENV': '"development"' },
    minify: false,
    logLevel: 'info',
});

if (result.errors.length) process.exit(1);
