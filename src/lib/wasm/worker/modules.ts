/**
 * Lazy WASM module loading.
 *
 * Every `@vitavision/*` package is dynamically `import()`-ed on first use and
 * initialised via its `default()` init function; the resulting promise is
 * cached so concurrent/later calls reuse the same initialised module. This
 * must stay a runtime dynamic import (never a top-level static import of a
 * WASM package) so the module's `.wasm` binary is only fetched once a
 * detection/command actually needs it.
 */

interface WasmModule {
    default: () => Promise<unknown>;
}

/** Build a cached, lazily-initialised accessor for a WASM package. */
export function lazyInit<T extends WasmModule>(loader: () => Promise<T>): () => Promise<T> {
    let cached: Promise<T> | null = null;
    return () => {
        if (!cached) {
            cached = loader().then(async (mod) => {
                await mod.default();
                return mod;
            });
        }
        return cached;
    };
}

export const getChessModule = lazyInit(() => import("@vitavision/chess-corners"));
export const getCalibModule = lazyInit(() => import("@vitavision/calib-targets"));
export const getRinggridModule = lazyInit(() => import("@vitavision/ringgrid"));
export const getRadsymModule = lazyInit(() => import("@vitavision/radsym"));
