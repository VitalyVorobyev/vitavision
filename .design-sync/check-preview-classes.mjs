// Verifies that every Tailwind class used in .design-sync/previews/*.tsx actually
// exists in the shipped stylesheet.
//
// Why this is needed: the DS stylesheet is Vite's compiled output, and Tailwind v4
// only generates utilities it finds in the scanned sources. The preview files are
// NOT in that scan, so a class used only in a preview produces no rule at all —
// silently. There is no error; the card just renders unstyled, and for sizing
// utilities (h-40, w-72) it collapses to zero height and reads as "blank".
//
//   node .design-sync/check-preview-classes.mjs [Name ...]
//
// Exits 1 if any class is missing. Fix by switching to a class the app already
// uses, or by setting the exact value with an inline `style`.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PREVIEWS = join(HERE, 'previews');

let css = '';
for (const p of ['ds-bundle/styles.css', 'ds-bundle/_ds_bundle.css']) {
    const f = join(REPO, p);
    if (existsSync(f)) css += readFileSync(f, 'utf8');
}
if (!css) {
    console.error('! no compiled CSS found under ds-bundle/ — run the converter build first');
    process.exit(1);
}

// Tailwind escapes non-identifier characters in its generated selectors.
const esc = (c) => c.replace(/[.:/[\]%(),#!&>+*~='"|^$?{}\\]/g, (m) => '\\' + m);

// Classes that never map to a utility rule: they are targets for other CSS, or
// Tailwind state/group markers that only appear as part of a compound selector.
const IGNORE = /^(group|peer|dark|prose|not-prose|sr-only|mermaid-diagram|number-field-input|ds-.*)$/;

const only = process.argv.slice(2);
const files = readdirSync(PREVIEWS)
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => !only.length || only.includes(f.replace(/\.tsx$/, '')));

let bad = 0;
for (const file of files) {
    const src = readFileSync(join(PREVIEWS, file), 'utf8');
    const missing = new Set();
    // className="…" and className={`…`} — string literals only; expressions are skipped.
    for (const m of src.matchAll(/className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
        const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
        for (const cls of raw.split(/\s+/).filter(Boolean)) {
            if (IGNORE.test(cls)) continue;
            if (!css.includes('.' + esc(cls))) missing.add(cls);
        }
    }
    if (missing.size) {
        bad++;
        console.error(`✗ ${file}: ${[...missing].join(', ')}`);
    }
}

if (bad) {
    console.error(`\n${bad} preview file(s) use classes with no rule in the shipped CSS.`);
    console.error('Swap for a class the app already uses, or set the value with inline style={{…}}.');
    process.exit(1);
}
console.error(`✓ ${files.length} preview file(s): every class resolves in the shipped CSS`);
