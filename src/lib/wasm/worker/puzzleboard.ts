import { generateId, toPoint, toPointOrNull, gridFromWasm, alignmentFromWasm, deepMerge, unwrapMaps } from "./util";
import { getCalibModule } from "./modules";

export function adaptPuzzleboardResult(
    raw: unknown,
    runtimeMs: number,
    width: number,
    height: number,
    _config: unknown,
) {
    if (raw === null || raw === undefined) {
        return {
            status: "success" as const,
            key: "wasm://local",
            storage_mode: "local" as const,
            image_width: width,
            image_height: height,
            frame: {
                name: "image_px_center" as const,
                origin: "top_left" as const,
                x_axis: "right" as const,
                y_axis: "down" as const,
                units: "pixels" as const,
            },
            summary: {
                corner_count: 0,
                mean_confidence: 0,
                bit_error_rate: 0,
                master_origin: [0, 0] as [number, number],
                runtime_ms: runtimeMs,
            },
            detection: { kind: "puzzleboard" as const, corners: [] },
            alignment: { transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] as [number, number] },
            decode: { edges_observed: 0, edges_matched: 0, mean_confidence: 0, bit_error_rate: 0, master_origin_row: 0, master_origin_col: 0 },
            observed_edges: [],
        };
    }

    const r = raw as Record<string, unknown>;
    const detection = r.detection as { kind: string; corners: Array<Record<string, unknown>> };
    const decodeRaw = r.decode as Record<string, unknown>;
    const observedEdgesRaw = (r.observed_edges as Array<Record<string, unknown>>) ?? [];

    const corners = detection.corners.map((c) => {
        const pos = toPoint(c.position);
        // calib-targets 0.10.1 renamed the wire grid coordinate from
        // GridCoords{i,j} to Coord{u,v}; map it back onto the internal {i,j}
        // shape PuzzleboardOverlay and the rest of the app expect.
        const grid = gridFromWasm(c.grid);
        const tp = toPointOrNull(c.target_position);
        return {
            id: generateId(),
            // +0.5: corner detector uses pixel-center coords; canvas expects pixel-corner coords
            x: pos.x + 0.5,
            y: pos.y + 0.5,
            score: (c.score as number) ?? 0,
            grid,
            master_id: (c.id as number) ?? null,
            target_position: tp ? { x: tp.x, y: tp.y } : null,
        };
    });

    const alignment = r.alignment
        ? alignmentFromWasm(r.alignment)
        : { transform: { a: 1, b: 0, c: 0, d: 1 }, translation: [0, 0] as [number, number] };

    const decode = {
        edges_observed: (decodeRaw?.edges_observed as number) ?? 0,
        edges_matched: (decodeRaw?.edges_matched as number) ?? 0,
        mean_confidence: (decodeRaw?.mean_confidence as number) ?? 0,
        bit_error_rate: (decodeRaw?.bit_error_rate as number) ?? 0,
        master_origin_row: (decodeRaw?.master_origin_row as number) ?? 0,
        master_origin_col: (decodeRaw?.master_origin_col as number) ?? 0,
    };

    const observedEdges = observedEdgesRaw.map((e) => ({
        row: e.row as number,
        col: e.col as number,
        orientation: e.orientation as "horizontal" | "vertical",
        bit: e.bit as 0 | 1,
        confidence: e.confidence as number,
    }));

    return {
        status: "success" as const,
        key: "wasm://local",
        storage_mode: "local" as const,
        image_width: width,
        image_height: height,
        frame: {
            name: "image_px_center" as const,
            origin: "top_left" as const,
            x_axis: "right" as const,
            y_axis: "down" as const,
            units: "pixels" as const,
        },
        summary: {
            corner_count: corners.length,
            mean_confidence: decode.mean_confidence,
            bit_error_rate: decode.bit_error_rate,
            master_origin: [decode.master_origin_row, decode.master_origin_col] as [number, number],
            runtime_ms: runtimeMs,
        },
        detection: { kind: "puzzleboard" as const, corners },
        alignment,
        decode,
        observed_edges: observedEdges,
    };
}

export async function handlePuzzleboard(
    pixels: Uint8Array,
    width: number,
    height: number,
    config: Record<string, unknown>,
) {
    const mod = await getCalibModule();

    const gray = mod.rgba_to_gray(pixels, width, height);

    // Read board dimensions for defaults
    const board = (config.board ?? {}) as Record<string, unknown>;
    const rows = (board.rows as number) ?? 10;
    const cols = (board.cols as number) ?? 10;

    const defaults = mod.default_puzzleboard_params(rows, cols) as Record<string, unknown>;
    const merged = deepMerge(defaults, config);

    const t0 = performance.now();
    // 0.10.1 flattened PuzzleBoardDetectionResult to { corners, alignment, decode }
    // — the `detection` wrapper is gone, and `observed_edges` (consumed by
    // PuzzleboardOverlay's edge-bit markers) moved to the `diagnose_*`
    // sibling, which also returns a nested Map (see unwrapMaps).
    //
    // The two variants differ on failure: the plain one throws, while
    // diagnose_puzzleboard resolves `result` to *undefined* (not null) and still
    // populates diagnostics. We use the diagnostics variant for observed_edges
    // and re-raise ourselves, so a failed decode stays a surfaced error rather
    // than a quiet empty-but-successful result.
    const withDiag = unwrapMaps(
        mod.diagnose_puzzleboard(width, height, gray, null, merged),
    ) as {
        result?: { corners: unknown[]; alignment: unknown; decode: unknown } | null;
        diagnostics?: { observed_edges?: unknown[] };
    };
    if (withDiag?.result == null) {
        throw new Error("decoding failed: no position match above confidence threshold");
    }
    const normalized = {
        detection: { kind: "puzzleboard", corners: withDiag.result.corners },
        alignment: withDiag.result.alignment,
        decode: withDiag.result.decode,
        observed_edges: withDiag.diagnostics?.observed_edges ?? [],
    };
    const runtimeMs = performance.now() - t0;

    return adaptPuzzleboardResult(normalized, runtimeMs, width, height, merged);
}

export async function handlePuzzleboardGenPng(
    rows: number,
    cols: number,
    cellSizeMm: number,
    dpi: number,
): Promise<{ png: Uint8Array; mimeType: string }> {
    const mod = await getCalibModule();
    const png = mod.render_puzzleboard_png(rows, cols, cellSizeMm, dpi);
    return { png, mimeType: "image/png" };
}
