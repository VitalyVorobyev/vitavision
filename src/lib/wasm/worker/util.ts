/**
 * Small, pure helpers shared across the per-package WASM handlers. Nothing
 * here touches `self`/`postMessage` or does any WASM module loading, so this
 * file imports cleanly under vitest/jsdom and under bun scripts alike.
 */

/** UUID generation with fallback for non-secure contexts (HTTP via --host). */
export function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Point helpers ────────────────────────────────────────────────────────────

/** Convert WASM point (which may be [x,y] array or {x,y} object) to {x,y}. */
export function toPoint(v: unknown): { x: number; y: number } {
    if (Array.isArray(v)) return { x: v[0] as number, y: v[1] as number };
    return v as { x: number; y: number };
}

export function toPointOrNull(v: unknown): { x: number; y: number } | null {
    if (v == null) return null;
    return toPoint(v);
}

export function toPointArray(v: unknown): Array<{ x: number; y: number }> {
    const arr = v as Array<unknown>;
    return arr.map(toPoint);
}

export function toPointArrayOrNull(v: unknown): Array<{ x: number; y: number }> | null {
    if (v == null) return null;
    return toPointArray(v);
}

/**
 * calib-targets ≥0.14 emits the wire grid coordinate as `Coord{u,v}` (renamed
 * from `GridCoords{i,j}` in 0.10.1); map it back onto the internal `{i,j}`
 * shape the rest of the app (overlays, feature meta) still uses. Shared by
 * calibration-target corners and puzzleboard corners — both wrap the same
 * `{u,v} | null` wire shape.
 */
export function gridFromWasm(raw: unknown): { i: number; j: number } | null {
    const g = raw as { u: number; v: number } | null;
    return g ? { i: g.u, j: g.v } : null;
}

/**
 * calib-targets ≥0.14 emits `GridAlignment` as `{ lattice, matrix, translation }`
 * with a row-major integer `matrix` applied before `translation`. The app keeps
 * the older `{ transform: {a,b,c,d}, translation }` shape (PuzzleboardOverlay maps
 * local edge coords to master ids with it), so convert here:
 * master = [[a, b], [c, d]] · local + translation.
 */
export function alignmentFromWasm(raw: unknown): {
    transform: { a: number; b: number; c: number; d: number };
    translation: [number, number];
} {
    const al = raw as { matrix: [[number, number], [number, number]]; translation: [number, number] };
    const [[a, b], [c, d]] = al.matrix;
    return { transform: { a, b, c, d }, translation: [al.translation[0], al.translation[1]] };
}

// ── Config merging ───────────────────────────────────────────────────────────

/**
 * Deep-merge source into target, overwriting only leaf values present in source.
 * Arrays are replaced entirely (not merged element-wise).
 */
export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const out = { ...target };
    for (const key of Object.keys(source)) {
        const sv = source[key];
        const tv = target[key];
        if (sv !== null && typeof sv === "object" && !Array.isArray(sv) && tv !== null && typeof tv === "object" && !Array.isArray(tv)) {
            out[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
        } else {
            out[key] = sv;
        }
    }
    return out;
}

/**
 * Recursively convert a value that may contain nested JS `Map`s into plain
 * objects/arrays.
 *
 * The `diagnose_*` functions in @vitavision/calib-targets (named
 * `detect_*_with_diagnostics` before 0.13) return payloads that are
 * `instanceof Map` at EVERY object level,
 * despite the package's `.d.ts` declaring a plain `{ result, diagnostics }`
 * object — an upstream serde_wasm_bindgen quirk verified empirically against
 * the real WASM module, not inferred from the (misleading) type declaration.
 * `Object.fromEntries` only unwraps the outermost Map; nested values (e.g.
 * `cell`, `expected`, `offset_cells`) remain Maps that `JSON.stringify`
 * silently renders as `{}`. This helper walks the whole tree so downstream
 * code can treat the result as ordinary JSON — do not delete it as
 * "redundant" without re-checking the raw WASM output.
 */
export function unwrapMaps(value: unknown): unknown {
    if (value instanceof Map) {
        const out: Record<string, unknown> = {};
        for (const [key, v] of value.entries()) out[key] = unwrapMaps(v);
        return out;
    }
    if (Array.isArray(value)) return value.map(unwrapMaps);
    if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>)) {
            out[key] = unwrapMaps((value as Record<string, unknown>)[key]);
        }
        return out;
    }
    return value;
}

// ── Render-bundle mapping ────────────────────────────────────────────────────

/** Raw `GeneratedTargetBundle` shape returned by both calib-targets' and
 * ringgrid's `render_target_bundle_json` — verified against the real WASM
 * modules (see `printableDocument.ts` / `ringgridTarget.ts` header comments
 * for the verification method), not inferred from the `.d.ts`'s `any` return
 * type. */
export interface RawTargetBundle {
    json_text: string;
    svg_text: string;
    png_bytes: Uint8Array;
    dxf_text: string;
}

export interface TargetBundle {
    svg: string;
    dxf: string;
    json: string;
    png: Uint8Array;
}

/** Map the library's `{json_text,svg_text,png_bytes,dxf_text}` bundle to the
 * app's `{svg,dxf,json,png}` shape — identical mapping used by both
 * calib-targets' and ringgrid's render-bundle commands. */
export function mapTargetBundle(bundle: RawTargetBundle): TargetBundle {
    return { svg: bundle.svg_text, dxf: bundle.dxf_text, json: bundle.json_text, png: bundle.png_bytes };
}
