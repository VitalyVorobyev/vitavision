import { useState } from "react";
import { Download, Archive } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@vitavision/ui";
import { rasterizeSvgToPng } from "../pngRasterizer";
import type { TargetConfig, PageConfig, TargetGeneratorState } from "../types";

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function buildFilename(state: TargetGeneratorState, ext: string): string {
    const t = state.target;
    let dims: string;
    switch (t.targetType) {
        case "chessboard":
            dims = `${t.config.innerRows}x${t.config.innerCols}`;
            break;
        case "charuco":
            dims = `${t.config.rows}x${t.config.cols}`;
            break;
        case "markerboard":
            dims = `${t.config.innerRows}x${t.config.innerCols}`;
            break;
        case "ringgrid":
            dims = `${t.config.rows}x${t.config.longRowCols}`;
            break;
        case "puzzleboard":
            dims = `${t.config.rows}x${t.config.cols}`;
            break;
        case "puzzlepole":
            dims = `${t.config.circumferenceSquares}x${t.config.axialSquares}`;
            break;
    }
    return `vitavision_${t.targetType}_${dims}.${ext}`;
}

/**
 * Produces the DXF for a target. Injected rather than imported so this stays a
 * presentational component: `generateDxf` reaches the WASM worker proxy, and
 * every component exported from `.design-sync/ds-entry.tsx` renders in
 * isolation on claude.ai/design with no worker and no .wasm asset served. A
 * static import would make the whole preview card render blank with nothing in
 * any log (`scripts/validate-ds-boundary.ts` is what catches that).
 *
 * Optional for the same reason: with no generator wired in, the DXF and ZIP
 * buttons simply disable rather than throwing on click.
 */
export type DxfGenerator = (target: TargetConfig, page: PageConfig) => Promise<string>;

interface Props {
    state: TargetGeneratorState;
    generateDxf?: DxfGenerator;
}

export default function DownloadBar({ state, generateDxf }: Props) {
    const hasErrors = state.validation.errors.length > 0;
    const svg = state.previewSvg;
    const [generatingDxf, setGeneratingDxf] = useState(false);
    const [zipping, setZipping] = useState(false);

    const handleSvg = () => {
        if (!svg) return;
        downloadBlob(
            new Blob([svg], { type: "image/svg+xml" }),
            buildFilename(state, "svg"),
        );
    };

    // Deliberately rasterizes the app's own preview SVG (which already has
    // the scale line spliced in when enabled) rather than the WASM bundle's
    // `png_bytes`. The library's PNG carries a correct `pHYs` print-scale
    // chunk, but it is rendered from the library's SVG before the app-side
    // scale line overlay exists, so using it here would silently drop the
    // scale line from PNG exports. Switching to `png_bytes` is a possible
    // future optimisation, not something overlooked.
    const handlePng = async () => {
        if (!svg) return;
        const blob = await rasterizeSvgToPng(svg, state.page.pngDpi);
        downloadBlob(blob, buildFilename(state, "png"));
    };

    const handleDxf = async () => {
        if (!generateDxf) return;
        setGeneratingDxf(true);
        try {
            const dxf = await generateDxf(state.target, state.page);
            downloadBlob(
                new Blob([dxf], { type: "application/dxf" }),
                buildFilename(state, "dxf"),
            );
        } catch (error) {
            console.error("Failed to generate DXF", error);
        } finally {
            setGeneratingDxf(false);
        }
    };

    const handleJson = () => {
        const json = JSON.stringify(
            { target: state.target, page: state.page },
            null,
            2,
        );
        downloadBlob(
            new Blob([json], { type: "application/json" }),
            buildFilename(state, "json"),
        );
    };

    const handleZip = async () => {
        if (!svg || !generateDxf) return;
        setZipping(true);
        try {
            const zip = new JSZip();
            const base = buildFilename(state, "").replace(/\.$/, "");
            zip.file(`${base}.svg`, svg);
            zip.file(`${base}.json`, JSON.stringify({ target: state.target, page: state.page }, null, 2));
            zip.file(`${base}.dxf`, await generateDxf(state.target, state.page));
            const pngBlob = await rasterizeSvgToPng(svg, state.page.pngDpi);
            zip.file(`${base}.png`, pngBlob);
            const zipBlob = await zip.generateAsync({ type: "blob" });
            downloadBlob(zipBlob, `${base}.zip`);
        } catch (error) {
            console.error("Failed to build ZIP bundle", error);
        } finally {
            setZipping(false);
        }
    };

    const disabled = hasErrors || !svg || generatingDxf || zipping;
    // DXF and the ZIP bundle both need the injected generator.
    const dxfDisabled = disabled || !generateDxf;

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleSvg} disabled={disabled} title="Download SVG" icon={<Download />}>
                    SVG
                </Button>
                <Button onClick={() => void handlePng()} disabled={disabled} title="Download PNG" icon={<Download />}>
                    PNG
                </Button>
                <Button onClick={handleJson} disabled={disabled} title="Download config JSON" icon={<Download />}>
                    JSON
                </Button>
                <Button
                    onClick={() => void handleDxf()}
                    disabled={dxfDisabled}
                    title="Download DXF"
                    icon={<Download />}
                >
                    DXF
                </Button>
            </div>
            <Button
                variant="primary"
                className="w-full"
                onClick={() => void handleZip()}
                disabled={dxfDisabled}
                loading={zipping}
                title="Download all formats as ZIP"
                icon={<Archive />}
            >
                {zipping ? "Bundling…" : "Download All (ZIP)"}
            </Button>
        </div>
    );
}
