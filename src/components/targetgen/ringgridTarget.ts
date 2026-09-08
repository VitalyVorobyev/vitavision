/**
 * Maps the app's `RingGridConfig` / `PageConfig` (see `./types`) onto the
 * `ringgrid.target.v6` target spec and `TargetRenderOptions` schemas consumed
 * by `@vitavision/ringgrid`'s `render_target_bundle_json(target_json,
 * options_json)` and `target_page_size_mm(target_json, options_json)`.
 *
 * This module is pure and dependency-free — it does not import the WASM
 * package, so it can be unit-tested and used from the differential harness
 * (`scripts/test-target-generators.ts`) without paying WASM init cost.
 *
 * The shapes below were verified against the real 0.13.0 module by calling
 * `default_board_json()`, `target_page_size_mm()` and
 * `render_target_bundle_json()` directly and reading the results — not
 * inferred from field names or the `.d.ts`'s prose. In particular:
 *
 *   - `render_target_bundle_json` and `target_page_size_mm` both take TWO
 *     JSON STRING arguments (`target_json`, `options_json`) — unlike
 *     `@vitavision/calib-targets`'s single-object `render_target_bundle_json`.
 *     They use a different WASM module entirely (`getRinggridModule()`, not
 *     `getCalibModule()`), so the two families are not interchangeable.
 *   - `coding.codebook_profile` accepts only `"base"` or `"extended"` — the
 *     app's `RingGridProfile` is `"baseline" | "extended"`, so `"baseline"`
 *     maps to `"base"` (matching the existing mapping in the ringgrid
 *     detector adapter, `src/components/editor/algorithms/ringgrid/adapter.ts`).
 *   - The render-options schema is strict (`serde(deny_unknown_fields)`):
 *     passing an unrecognised top-level key throws `unknown field ...`. Only
 *     `page`, `include_scale_bar`, `png_dpi` are accepted.
 *   - `include_scale_bar` defaults to `true` on the library side. The app
 *     draws its own scale line (`svg/scaleLine.ts`), so every options object
 *     built here passes `include_scale_bar: false` to avoid a doubled bar.
 *   - `page.size.kind: "fit_content"` returns a SQUARE page sized
 *     `max(boardW, boardH) + 2 * margin_mm` on both axes — verified on wide,
 *     tall and square boards. That square is the library's real printed
 *     footprint for a ring grid and replaces the deleted TS-fork
 *     bounding-box math.
 */

import type { RingGridConfig, PageConfig } from "./types";

// ── Target schema (`ringgrid.target.v6`) ────────────────────────────────────

export type RinggridCodebookProfile = "base" | "extended";

export interface RinggridLatticeSpec {
    kind: "hex";
    rows: number;
    long_row_cols: number;
    pitch_mm: number;
}

export interface RinggridMarkerSpec {
    outer_radius_mm: number;
    inner_radius_mm: number;
}

export interface RinggridCodingSpec {
    kind: "coded16";
    ring_width_mm: number;
    codebook_profile: RinggridCodebookProfile;
}

export interface RinggridTargetSpec {
    schema: "ringgrid.target.v6";
    name: string;
    lattice: RinggridLatticeSpec;
    marker: RinggridMarkerSpec;
    coding: RinggridCodingSpec;
}

// ── Render-options schema ────────────────────────────────────────────────────

export type RinggridPageSizeKind = "fit_content" | "a4" | "letter" | "custom";

export interface RinggridPageSize {
    kind: RinggridPageSizeKind;
    width_mm?: number;
    height_mm?: number;
}

export interface RinggridPageSpec {
    size: RinggridPageSize;
    orientation: "portrait" | "landscape";
    margin_mm: number;
}

export interface RinggridRenderOptions {
    page: RinggridPageSpec;
    include_scale_bar: boolean;
    png_dpi: number;
}

// ── mapping ──────────────────────────────────────────────────────────────────

function toCodebookProfile(profile: RingGridConfig["profile"]): RinggridCodebookProfile {
    return profile === "extended" ? "extended" : "base";
}

export function toRinggridTarget(config: RingGridConfig): RinggridTargetSpec {
    return {
        schema: "ringgrid.target.v6",
        name: "vitavision-ringgrid-target",
        lattice: {
            kind: "hex",
            rows: config.rows,
            long_row_cols: config.longRowCols,
            pitch_mm: config.pitchMm,
        },
        marker: {
            outer_radius_mm: config.markerOuterRadiusMm,
            inner_radius_mm: config.markerInnerRadiusMm,
        },
        coding: {
            kind: "coded16",
            ring_width_mm: config.markerRingWidthMm,
            codebook_profile: toCodebookProfile(config.profile),
        },
    };
}

export function toRinggridRenderOptions(page: PageConfig): RinggridRenderOptions {
    let size: RinggridPageSize;
    switch (page.sizeKind) {
        case "a4":
            size = { kind: "a4" };
            break;
        case "letter":
            size = { kind: "letter" };
            break;
        case "custom":
            // Pass the UNSWAPPED custom width/height, same convention as
            // `printableDocument.ts::toPageSpec` — the library applies the
            // landscape swap itself (verified above), so swapping here too
            // would double-apply it for a custom landscape page.
            size = { kind: "custom", width_mm: page.customWidthMm, height_mm: page.customHeightMm };
            break;
    }
    return {
        page: {
            size,
            orientation: page.orientation,
            margin_mm: page.marginMm,
        },
        // The app always draws its own scale line overlay — never the
        // library's — so this is unconditionally false regardless of
        // `page.showScaleLine` (that flag controls the app's own overlay in
        // `svg/index.ts` / `dxf/index.ts`).
        include_scale_bar: false,
        png_dpi: page.pngDpi,
    };
}

/**
 * Render options for asking the library a ring-grid target's true printed
 * footprint, independent of the app's page settings — used by the
 * board-dimension validation/preview path (`validation.ts`,
 * `TargetPreview.tsx`), not by the print/export path.
 *
 * `fit_content` with `margin_mm: 0` returns the bare board bounding square
 * (`max(boardW, boardH)`, no page padding) — the direct replacement for the
 * deleted TS fork's `markerBounds` + `markerOuterDrawRadius` bounding-box
 * math. `include_scale_bar` and `png_dpi` don't affect the returned size (verified
 * against the real module) but are set explicitly for schema clarity.
 */
export function toRinggridBoardSizeOptions(): RinggridRenderOptions {
    return {
        page: { size: { kind: "fit_content" }, orientation: "portrait", margin_mm: 0 },
        include_scale_bar: false,
        png_dpi: 300,
    };
}
