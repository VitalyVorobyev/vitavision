/**
 * Paper-reference type definitions.
 *
 * These describe the shape of the `PaperRef`/`PapersById` types re-exported from
 * `src/generated/papers-index.ts`, the tiny build-emitted shim for
 * `public/papers-index.json` (see `scripts/build/emit.ts#emitPapersIndex`). Defining
 * them here — rather than as string-literal text baked into the generated file —
 * gives the builder script and the generated output one real, type-checked source
 * of truth. The generated file re-exports these via `export type { ... }` so
 * existing client imports from `../generated/papers-index.ts` keep working unchanged.
 */

export interface PaperRef {
    id: string;
    title: string;
    authors: string[];
    year: number;
    venue: string;
    url: string;
    arxiv?: string;
    doi?: string;
}

export type PapersById = Record<string, PaperRef>;
