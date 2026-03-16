import { Download } from "lucide-react";
import { rasterizeSvgToPng } from "../pngRasterizer";
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
    generate: () => Promise<void>;
}

export default function DownloadBar({ state, generate }: Props) {
    const hasFinal = state.finalSvg !== null;
    const hasErrors = state.validation.errors.length > 0;
    const isGenerating = state.generationStatus === "generating";

    const ensureFinal = async (): Promise<string | null> => {
        if (state.finalSvg) return state.finalSvg;
        await generate();
        // After generate, finalSvg should be set — but we can't access the new
        // state directly here. The caller should re-check. For download, we
        // return null and let the UI handle it after state updates.
        return null;
    };

    const handleSvg = async () => {
        let svg = state.finalSvg;
        if (!svg) {
            await generate();
            // The state won't update synchronously. A second click will work.
            return;
        }
        svg = state.finalSvg!;
        downloadBlob(
            new Blob([svg], { type: "image/svg+xml" }),
            buildFilename(state, "svg"),
        );
    };

    const handlePng = async () => {
        let svg = state.finalSvg;
        if (!svg) {
            await ensureFinal();
            return;
        }
        svg = state.finalSvg!;
        const blob = await rasterizeSvgToPng(svg);
        downloadBlob(blob, buildFilename(state, "png"));
    };

    const handleJson = async () => {
        let json = state.configJson;
        if (!json) {
            await ensureFinal();
            return;
        }
        json = state.configJson!;
        downloadBlob(
            new Blob([json], { type: "application/json" }),
            buildFilename(state, "json"),
        );
    };

    const btnClass =
        "flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors " +
        "hover:border-muted-foreground/40 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="flex gap-2">
            <button
                className={btnClass}
                onClick={handleSvg}
                disabled={hasErrors || isGenerating}
                title={hasFinal ? "Download SVG" : "Generate & download SVG"}
            >
                <Download size={14} />
                SVG
            </button>
            <button
                className={btnClass}
                onClick={handlePng}
                disabled={hasErrors || isGenerating}
                title={hasFinal ? "Download PNG" : "Generate & download PNG"}
            >
                <Download size={14} />
                PNG
            </button>
            <button
                className={btnClass}
                onClick={handleJson}
                disabled={hasErrors || isGenerating}
                title={hasFinal ? "Download config" : "Generate & download config"}
            >
                <Download size={14} />
                JSON
            </button>
        </div>
    );
}
