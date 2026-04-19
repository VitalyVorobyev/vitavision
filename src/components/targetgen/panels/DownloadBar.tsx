import { useState } from "react";
import { Download, Archive } from "lucide-react";
import JSZip from "jszip";
import { rasterizeSvgToPng } from "../pngRasterizer";
import { generateDxf } from "../dxf";
import type { TargetGeneratorState } from "../types";

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
    }
    return `vitavision_${t.targetType}_${dims}.${ext}`;
}

interface Props {
    state: TargetGeneratorState;
}

export default function DownloadBar({ state }: Props) {
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

    const handlePng = async () => {
        if (!svg) return;
        const blob = await rasterizeSvgToPng(svg, state.page.pngDpi);
        downloadBlob(blob, buildFilename(state, "png"));
    };

    const handleDxf = async () => {
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
        if (!svg) return;
        setZipping(true);
        try {
            const zip = new JSZip();
            const base = buildFilename(state, "").replace(/\.$/, "");
            zip.file(`${base}.svg`, svg);
            zip.file(`${base}.json`, JSON.stringify({ target: state.target, page: state.page }, null, 2));
            if (!isPuzzleboard) {
                zip.file(`${base}.dxf`, await generateDxf(state.target, state.page));
            }
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

    const isPuzzleboard = state.target.targetType === "puzzleboard";
    const disabled = hasErrors || !svg || generatingDxf || zipping;
    const dxfDisabled = disabled || isPuzzleboard;

    const btnClass =
        "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors " +
        "hover:border-muted-foreground/40 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <button className={btnClass} onClick={handleSvg} disabled={disabled} title="Download SVG">
                    <Download size={14} />
                    SVG
                </button>
                <button className={btnClass} onClick={handlePng} disabled={disabled} title="Download PNG">
                    <Download size={14} />
                    PNG
                </button>
                <button className={btnClass} onClick={handleJson} disabled={disabled} title="Download config JSON">
                    <Download size={14} />
                    JSON
                </button>
                <button
                    className={btnClass}
                    onClick={() => void handleDxf()}
                    disabled={dxfDisabled}
                    title={isPuzzleboard ? "DXF is not available for PuzzleBoard" : "Download DXF"}
                >
                    <Download size={14} />
                    DXF
                </button>
            </div>
            <button
                className={`${btnClass} w-full justify-center`}
                onClick={() => void handleZip()}
                disabled={disabled}
                title="Download all formats as ZIP"
            >
                <Archive size={14} />
                {zipping ? "Bundling…" : "Download All (ZIP)"}
            </button>
        </div>
    );
}
