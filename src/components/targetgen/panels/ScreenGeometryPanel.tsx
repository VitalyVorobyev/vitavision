import { Callout, Section } from "@vitavision/ui";
import type { ScreenGeometry, ScreenRenderResult } from "../types";

/** Up to 4 decimals, no trailing zeros: 20.0385, 20, 12.5. */
function fmt(v: number, digits = 4): string {
    return String(Number(v.toFixed(digits)));
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="font-mono tabular-nums text-fg">{children}</dd>
        </div>
    );
}

function GridRows({ g }: { g: Extract<ScreenGeometry, { kind: "grid" }> }) {
    return (
        <>
            <Row label="Square">
                {g.squareSizePx} px = {fmt(g.squareSizeMm)} mm{" "}
                <span className="text-fg-muted">(requested {fmt(g.requestedSquareSizeMm)} mm)</span>
            </Row>
            <Row label="Board origin">
                ({fmt(g.boardOriginPx[0], 2)}, {fmt(g.boardOriginPx[1], 2)}) px
            </Row>
        </>
    );
}

function RinggridRows({ g }: { g: Extract<ScreenGeometry, { kind: "ringgrid" }> }) {
    return (
        <>
            <Row label="Grid">
                {g.rows} rows × {g.columns} columns
            </Row>
            <Row label="Markers">{g.markerCount}</Row>
            <Row label="Marker diameter">
                {fmt(g.drawnMarkerDiameterPx, 2)} px = {fmt(g.drawnMarkerDiameterMm)} mm
            </Row>
            {g.codeBandWidthPx !== null && <Row label="Code band">{fmt(g.codeBandWidthPx, 2)} px</Row>}
            <Row label="Board origin">
                ({fmt(g.boardOriginPx[0], 2)}, {fmt(g.boardOriginPx[1], 2)}) px
            </Row>
        </>
    );
}

/**
 * The geometry the library actually drew, from the sidecar. Presentational: the
 * result is computed by the generation flow and passed in through state.
 */
export default function ScreenGeometryPanel({ result }: { result: ScreenRenderResult | null }) {
    if (!result) return null;
    const g = result.geometry;
    return (
        <Section title="Realised geometry">
            <div className="flex flex-col gap-2">
                <dl className="flex flex-col gap-1 text-sm">
                    <Row label="Image">
                        {result.widthPx} × {result.heightPx} px
                    </Row>
                    {g.kind === "grid" ? <GridRows g={g} /> : <RinggridRows g={g} />}
                </dl>
                <Callout tone="info" title="Calibrate with these values" className="text-xs">
                    {g.kind === "grid"
                        ? "The library snaps the square to a whole number of pixels, so the realised size differs from the requested one. Use the realised size in your calibration, not the requested one."
                        : "The library fits the grid to the display and reports the drawn marker size. Use the sidecar's fitted target (not the rows and columns you entered) as the detector's board description."}
                </Callout>
            </div>
        </Section>
    );
}
