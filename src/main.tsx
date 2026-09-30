import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// IBM Plex Sans and Plex Mono, the vitavision type pair (lab-ui ADR-0003). Imported here
// rather than with `@import` in index.css: under @tailwindcss/postcss, Vite inlines a CSS
// @import before Tailwind runs and Tailwind's AST round-trip drops the source file, so the
// font files' relative url()s would resolve against src/ and ship broken. As a module of
// its own the stylesheet keeps its location and Vite emits the fonts.
import '@vitavision/ui/fonts.css'
// Source Serif 4: the body face of the editorial pages only (lab-ui visual-language §7).
import '@fontsource-variable/source-serif-4/index.css'
import 'katex/dist/katex.min.css'
import './styles/article.css'
import App from './App.tsx'
import type { StaticContentContextValue } from './lib/content/ssr-content.tsx'

// Snapshot the prerendered article HTML before createRoot wipes it. The
// postbuild script bakes <article data-atlas-slug="..." data-atlas-kind="...">
// into each atlas page so the first client paint can render the same content
// synchronously — no spinner, no async chunk fetch on cold visits.
function readSSRSnapshot(): StaticContentContextValue {
    const el = document.querySelector<HTMLElement>(
        'article[data-atlas-slug][data-atlas-kind]',
    )
    if (!el) return {}
    const { atlasSlug: slug, atlasKind: kind } = el.dataset
    const html = el.innerHTML
    if (!slug || !kind || !html) return {}
    if (kind === 'algorithm') return { algorithmHtmlBySlug: { [slug]: html } }
    if (kind === 'model') return { modelHtmlBySlug: { [slug]: html } }
    if (kind === 'concept') return { conceptHtmlBySlug: { [slug]: html } }
    if (kind === 'narrative') return { narrativeHtmlBySlug: { [slug]: html } }
    return {}
}

const ssrSnapshot = readSSRSnapshot()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App ssrSnapshot={ssrSnapshot} />
  </StrictMode>,
)
