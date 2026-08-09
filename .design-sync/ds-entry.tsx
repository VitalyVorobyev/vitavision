// Design-system entry for /design-sync.
//
// vitavision is an application, not a published component package: there is no
// `dist/` of components and no `exports` map. This file is the design-system
// surface — the curated set of presentational components that render standalone
// (no editor store, no react-konva, no WASM worker) and that the claude.ai/design
// agent builds with.
//
// Adding a component here is what puts it in the synced design system; it must
// also be listed in `.design-sync/config.json` under `componentSrcMap` so the
// converter can find its source for props, JSDoc, and grouping.

import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import papersIndex from '../public/papers-index.json';
import { PapersContext } from '../src/lib/atlas/papersContext.ts';
import type { PapersById } from '../src/generated/papers-index.ts';

/**
 * Preview/render wrapper for design-system components.
 *
 * Provides the two contexts the presentational components read:
 *
 * - **Router** — several components render `<Link>` from react-router-dom,
 *   which throws outside a router context.
 * - **Papers** — `SourceCard` / `SourceStrip` resolve a paper by ID through
 *   `usePaperById`. In the app `PapersContext` is filled by a lazy fetch of
 *   `/papers-index.json`; nothing serves that during a design render, so the
 *   context stays `{}` and both components render blank. Seeding it from the
 *   same generated JSON makes every real paper ID resolve. Importing the
 *   context from source (rather than through the bundle) is what keeps the
 *   provider and the components on ONE context instance.
 *
 * - **Tooltip** — `Tooltip` renders `TooltipPrimitive.Root`, which reads
 *   Radix's provider context unconditionally. Radix gives that context no
 *   default value, so without an ancestor `Provider` the component throws and
 *   React swallows it — the card just goes blank, with no page error. In the
 *   app each call site supplies its own local Provider; there is no global
 *   one, so the design system has to bring it.
 *
 * Wired as `cfg.provider`, so it wraps every preview card and every design
 * built with this system.
 */
export function DesignPreviewProvider({ children }: { children?: ReactNode }) {
    return (
        <MemoryRouter>
            <TooltipPrimitive.Provider delayDuration={200}>
                <PapersContext.Provider value={papersIndex as PapersById}>
                    {children}
                </PapersContext.Provider>
            </TooltipPrimitive.Provider>
        </MemoryRouter>
    );
}

/* ── UI primitives ─────────────────────────────────────────────────────── */
export { default as Tooltip } from '../src/components/ui/Tooltip.tsx';
export { default as ErrorBoundary } from '../src/components/ui/ErrorBoundary.tsx';

/* ── Brand / shared chrome ─────────────────────────────────────────────── */
export { default as VitavisionLogo } from '../src/components/shared/VitavisionLogo.tsx';
export { default as ZoomControls } from '../src/components/shared/ZoomControls.tsx';
export { default as CanvasControlsHint } from '../src/components/shared/CanvasControlsHint.tsx';

// Footer is deliberately NOT exported. It hardcodes root-absolute icon srcs
// (`/github-mark.svg`, `/InBug-Black.png`, and their dark-mode twins) that live in
// `public/`. Nothing serves those to a rendered design, so the component ships two
// broken-image glyphs into every design built with it, and the srcs are hardcoded
// rather than prop-driven so no preview or config can fix it. Re-add it here (and to
// `componentSrcMap`) once the icons are inlined as SVG or accepted as props.

/* ── Blog ──────────────────────────────────────────────────────────────── */
export { default as DifficultyBadge } from '../src/components/blog/DifficultyBadge.tsx';
export { default as TagFilter } from '../src/components/blog/TagFilter.tsx';
export { default as TableOfContents } from '../src/components/blog/TableOfContents.tsx';
export { default as ReadingProgress } from '../src/components/blog/ReadingProgress.tsx';

/* ── Atlas ─────────────────────────────────────────────────────────────── */
export { default as QualityBadge } from '../src/components/atlas/QualityBadge.tsx';
export { SourceCard } from '../src/components/atlas/SourceCard.tsx';
export { default as SourceStrip } from '../src/components/atlas/SourceStrip.tsx';
export { EntryIcon } from '../src/components/atlas/EntryIcon.tsx';
export { default as ImplementationsList } from '../src/components/atlas/ImplementationsList.tsx';
export { default as AIDisclosure } from '../src/components/atlas/AIDisclosure.tsx';

/* ── Algorithms register ───────────────────────────────────────────────── */
export { default as AlgorithmGlyph } from '../src/components/algorithms/AlgorithmGlyph.tsx';
export { default as CategoryGlyph } from '../src/components/algorithms/CategoryGlyph.tsx';
export { default as AlgorithmsSidebar } from '../src/components/algorithms/AlgorithmsSidebar.tsx';
export { default as AlgorithmsViewToggle } from '../src/components/algorithms/AlgorithmsViewToggle.tsx';
export { default as AlgorithmsFilterSheet } from '../src/components/algorithms/AlgorithmsFilterSheet.tsx';

/* ── Demos ─────────────────────────────────────────────────────────────── */
export { default as DemoCover } from '../src/components/demos/DemoCover.tsx';
export { default as DemoThumbnail } from '../src/components/demos/DemoThumbnail.tsx';

/* ── Target generator ──────────────────────────────────────────────────── */
export { default as TargetPreview } from '../src/components/targetgen/TargetPreview.tsx';
export { default as TargetTypeSelector } from '../src/components/targetgen/panels/TargetTypeSelector.tsx';
export { default as PaperConfig } from '../src/components/targetgen/panels/PaperConfig.tsx';
export { default as TargetConfigPanel } from '../src/components/targetgen/panels/TargetConfigPanel.tsx';
export { default as DownloadBar } from '../src/components/targetgen/panels/DownloadBar.tsx';

/* ── Home specimens ────────────────────────────────────────────────────── */
export { SpecBlog, SpecAlgorithms, SpecEditor, SpecTargets } from '../src/components/home/specimens/index.tsx';

/* ── Illustration primitives ───────────────────────────────────────────── */
export {
    Panel,
    PanelFlat,
    FloatingPanel,
    TinyBrow,
    Eyebrow,
    MetricCell,
    Kbd,
    Pill,
    Note,
} from '../src/components/illustrations/_shared/primitives.tsx';
