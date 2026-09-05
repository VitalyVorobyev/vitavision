/**
 * Maps the app's `TargetConfig` / `PageConfig` (see `./types`) onto the
 * `PrintableTargetDocument` JSON schema consumed by
 * `@vitavision/calib-targets`'s `render_target_bundle_json(doc)`.
 *
 * This module is pure and dependency-free — it does not import the WASM
 * package, so it can be unit-tested and used from the differential harness
 * (`scripts/test-target-generators.ts`) without paying WASM init cost.
 *
 * The schema below was verified against the library's own
 * `testdata/printable/*.json` fixtures and the object-shape declarations at
 * the bottom of `node_modules/@vitavision/calib-targets/calib_targets_wasm.d.ts`
 * (`PrintableTargetDocument`, `PrintableTargetSpec`,
 * `PrintableMarkerCircleSpec`, `PageSpec`, `RenderOptions`) — not invented or
 * inferred from field names.
 */

import type {
    TargetConfig,
    PageConfig,
    ChessboardConfig,
    CharucoConfig,
    MarkerBoardConfig,
    PuzzleboardConfig,
    CircleSpec,
} from "./types";

// ── Page schema ──────────────────────────────────────────────────────────────

export type PrintablePageSize =
    | { kind: "a4" }
    | { kind: "letter" }
    | { kind: "custom"; width_mm: number; height_mm: number };

export interface PrintablePageSpec {
    size: PrintablePageSize;
    orientation: "portrait" | "landscape";
    margin_mm: number;
}

export interface PrintableRenderOptions {
    debug_annotations: boolean;
    png_dpi: number;
}

// ── Target schema ────────────────────────────────────────────────────────────

export type CirclePolarity = "white" | "black";

/**
 * One circular marker in the library's *printable* marker-board spec.
 *
 * NOTE the axis convention here is the opposite of the app's `CircleSpec`
 * (see `toMarkerCircleSpec` below for the full explanation) — `i` is the
 * column/x axis, `j` is the row/y axis.
 */
export interface PrintableMarkerCircleSpec {
    i: number;
    j: number;
    polarity: CirclePolarity;
}

export interface PrintableChessboardSpec {
    kind: "chessboard";
    inner_rows: number;
    inner_cols: number;
    square_size_mm: number;
    inner_square_rel?: number;
}

export interface PrintableCharucoSpec {
    kind: "charuco";
    rows: number;
    cols: number;
    square_size_mm: number;
    marker_size_rel: number;
    dictionary: string;
    border_bits: number;
    inner_square_rel?: number;
}

export interface PrintableMarkerBoardSpec {
    kind: "marker_board";
    inner_rows: number;
    inner_cols: number;
    square_size_mm: number;
    circle_diameter_rel: number;
    circles: [PrintableMarkerCircleSpec, PrintableMarkerCircleSpec, PrintableMarkerCircleSpec];
    inner_square_rel?: number;
}

export interface PrintablePuzzleBoardSpec {
    kind: "puzzle_board";
    rows: number;
    cols: number;
    square_size_mm: number;
    origin_row: number;
    origin_col: number;
    dot_diameter_rel: number;
}

export type PrintableTargetSpec =
    | PrintableChessboardSpec
    | PrintableCharucoSpec
    | PrintableMarkerBoardSpec
    | PrintablePuzzleBoardSpec;

export interface PrintableTargetDocument {
    schema_version: 1;
    target: PrintableTargetSpec;
    page: PrintablePageSpec;
    render: PrintableRenderOptions;
}

// ── constants ────────────────────────────────────────────────────────────────

/**
 * PuzzleBoard edge-dot diameter, as a fraction of the square side.
 *
 * The app has no config field for this — `svg/puzzleboardSvg.ts` hard-codes
 * the dot RADIUS as `sq / 6` (`const dotR = sq / 6;`), which is a diameter of
 * `sq / 3`, i.e. exactly `1/3` of the square side. Written out as a fraction
 * (rather than `sq / 6 / (sq / 2)` or similar) so it reads as the constant it
 * is rather than a computed coincidence.
 */
const PUZZLEBOARD_DOT_DIAMETER_REL = 1 / 3;

// ── page / render mapping ────────────────────────────────────────────────────

function toPageSpec(page: PageConfig): PrintablePageSpec {
    let size: PrintablePageSize;
    switch (page.sizeKind) {
        case "a4":
            size = { kind: "a4" };
            break;
        case "letter":
            size = { kind: "letter" };
            break;
        case "custom":
            // Pass the UNSWAPPED custom width/height. `orientation` below
            // maps straight from `PageConfig.orientation` and the library
            // applies the landscape swap itself (see
            // `svg/paperConstants.ts::resolvePageDimensions`, which performs
            // the equivalent swap on the TS side) — swapping here too would
            // double-apply it for a custom landscape page.
            size = { kind: "custom", width_mm: page.customWidthMm, height_mm: page.customHeightMm };
            break;
    }
    return {
        size,
        orientation: page.orientation,
        margin_mm: page.marginMm,
    };
}

function toRenderOptions(page: PageConfig): PrintableRenderOptions {
    return { debug_annotations: false, png_dpi: page.pngDpi };
}

/**
 * `inner_square_rel` is `Option<f64>` upstream with `skip_serializing_if`.
 * `None` and `Some(0.0)` behave identically, but omitting the key when the
 * app's value is 0 or negative keeps generated documents byte-identical to
 * pre-0.14.1 documents that never set this field at all.
 */
function withOptionalInnerSquareRel<T extends { inner_square_rel?: number }>(base: T, rel: number): T {
    return rel > 0 ? { ...base, inner_square_rel: rel } : base;
}

// ── per-kind target mapping ──────────────────────────────────────────────────

function toChessboardSpec(cfg: ChessboardConfig): PrintableChessboardSpec {
    const base: PrintableChessboardSpec = {
        kind: "chessboard",
        inner_rows: cfg.innerRows,
        inner_cols: cfg.innerCols,
        square_size_mm: cfg.squareSizeMm,
    };
    return withOptionalInnerSquareRel(base, cfg.innerSquareRel);
}

function toCharucoSpec(cfg: CharucoConfig): PrintableCharucoSpec {
    const base: PrintableCharucoSpec = {
        kind: "charuco",
        rows: cfg.rows,
        cols: cfg.cols,
        square_size_mm: cfg.squareSizeMm,
        marker_size_rel: cfg.markerSizeRel,
        dictionary: cfg.dictionary,
        border_bits: cfg.borderBits,
        // marker_layout deliberately omitted — the library defaults to
        // "opencv_charuco" (its only variant today), and the differential
        // harness proves that default matches the app's own layout rather
        // than us restating it here.
    };
    return withOptionalInnerSquareRel(base, cfg.innerSquareRel);
}

/**
 * Convert one app-side circle spec to the library's printable circle spec.
 *
 * ── THE AXIS-CONVENTION SWAP — read this before touching this function ────
 *
 * The app's `CircleSpec.cell` (`src/components/targetgen/types.ts`) uses
 * `{ i: row, j: column }`: `svg/markerboardSvg.ts` computes `cx` from
 * `circ.cell.j * sq` and `cy` from `circ.cell.i * sq`, i.e. `j` is the
 * horizontal axis and `i` is the vertical one.
 *
 * The library's `PrintableMarkerCircleSpec` uses the OPPOSITE convention.
 * `calib-targets-print/src/render.rs::build_marker_board` computes:
 *
 *   cx_mm = origin.x + (circle.i + 0.5) * square_size_mm
 *   cy_mm = origin.y + (circle.j + 0.5) * square_size_mm
 *
 * i.e. the library's `i` is the column/x axis and its `j` is the row/y axis
 * (the "i right, j down" convention).
 *
 * So converting one circle REQUIRES transposing `i` and `j`:
 * `{ i: cell.j, j: cell.i }`. This is exactly the defect class that made this
 * migration necessary in the first place (see the ArUco 180°-rotation bug in
 * commit 044653b) — do not "clean up" this swap, it is the fix, not a bug.
 *
 * `polarity` has no equivalent field on the app's `CircleSpec`; it is derived
 * the same way `svg/markerboardSvg.ts::circleColor` derives it — white when
 * `(row + col)` is even. Because `i + j` is symmetric, the transposition does
 * not change which polarity is derived — reading `cell.i + cell.j` before or
 * after the swap gives the same parity.
 */
function toMarkerCircleSpec(c: CircleSpec): PrintableMarkerCircleSpec {
    const polarity: CirclePolarity = (c.cell.i + c.cell.j) % 2 === 0 ? "white" : "black";
    return { i: c.cell.j, j: c.cell.i, polarity };
}

function toMarkerBoardSpec(cfg: MarkerBoardConfig): PrintableMarkerBoardSpec {
    const [c0, c1, c2] = cfg.circles;
    const base: PrintableMarkerBoardSpec = {
        kind: "marker_board",
        inner_rows: cfg.innerRows,
        inner_cols: cfg.innerCols,
        square_size_mm: cfg.squareSizeMm,
        circle_diameter_rel: cfg.circleDiameterRel,
        circles: [toMarkerCircleSpec(c0), toMarkerCircleSpec(c1), toMarkerCircleSpec(c2)],
    };
    return withOptionalInnerSquareRel(base, cfg.innerSquareRel);
}

function toPuzzleBoardSpec(cfg: PuzzleboardConfig): PrintablePuzzleBoardSpec {
    return {
        kind: "puzzle_board",
        rows: cfg.rows,
        cols: cfg.cols,
        // The app names this field `cellSizeMm`; the library's field is
        // `square_size_mm` — same quantity, different name.
        square_size_mm: cfg.cellSizeMm,
        origin_row: 0,
        origin_col: 0,
        dot_diameter_rel: PUZZLEBOARD_DOT_DIAMETER_REL,
    };
}

// ── entry point ──────────────────────────────────────────────────────────────

/**
 * Convert an app-side `TargetConfig` + `PageConfig` into the
 * `PrintableTargetDocument` JSON that `render_target_bundle_json` expects.
 *
 * Throws for `targetType === "ringgrid"` — ring grid is not a printable kind
 * in `@vitavision/calib-targets` and stays on the TS generator path
 * (`svg/ringgridSvg.ts`) for now.
 */
export function toPrintableDocument(target: TargetConfig, page: PageConfig): PrintableTargetDocument {
    let spec: PrintableTargetSpec;
    switch (target.targetType) {
        case "chessboard":
            spec = toChessboardSpec(target.config);
            break;
        case "charuco":
            spec = toCharucoSpec(target.config);
            break;
        case "markerboard":
            spec = toMarkerBoardSpec(target.config);
            break;
        case "puzzleboard":
            spec = toPuzzleBoardSpec(target.config);
            break;
        case "ringgrid":
            throw new Error(
                "toPrintableDocument: ring grid is not a printable kind in @vitavision/calib-targets " +
                "— it stays on the TS generator path (svg/ringgridSvg.ts) for now.",
            );
        default: {
            const exhaustive: never = target;
            throw new Error(`toPrintableDocument: unhandled target type ${JSON.stringify(exhaustive)}`);
        }
    }

    return {
        schema_version: 1,
        target: spec,
        page: toPageSpec(page),
        render: toRenderOptions(page),
    };
}
