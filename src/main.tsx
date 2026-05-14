import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/600.css'
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
    const el = document.querySelector(
        'article[data-atlas-slug][data-atlas-kind]',
    ) as HTMLElement | null
    if (!el) return {}
    const { atlasSlug: slug, atlasKind: kind } = el.dataset
    const html = el.innerHTML
    if (!slug || !kind || !html) return {}
    if (kind === 'algorithm') return { algorithmHtmlBySlug: { [slug]: html } }
    if (kind === 'model') return { modelHtmlBySlug: { [slug]: html } }
    if (kind === 'concept') return { conceptHtmlBySlug: { [slug]: html } }
    return {}
}

const ssrSnapshot = readSSRSnapshot()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App ssrSnapshot={ssrSnapshot} />
  </StrictMode>,
)
