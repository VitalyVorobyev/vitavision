import { Download } from "lucide-react";
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
    }
    return `vitavision_${t.targetType}_${dims}.${ext}`;
}

interface Props {
    state: TargetGeneratorState;
}

export default function DownloadBar({ state }: Props) {
    const hasErrors = state.validation.errors.length > 0;
    const svg = state.previewSvg;

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

    const handleDxf = () => {
        const dxf = generateDxf(state.target, state.page);
        downloadBlob(
            new Blob([dxf], { type: "application/dxf" }),
            buildFilename(state, "dxf"),
        );
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

    const disabled = hasErrors || !svg;

    const btnClass =
        "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors " +
        "hover:border-muted-foreground/40 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed";

    return (
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
            <button className={btnClass} onClick={handleDxf} disabled={disabled} title="Download DXF (geometry only)">
                <Download size={14} />
                DXF
            </button>
        </div>
    );
}
