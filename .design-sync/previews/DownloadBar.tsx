import { DownloadBar } from "vitcv";
import { validateConfig } from "../../src/components/targetgen/validation";
import { chessboardSvg } from "../../src/components/targetgen/svg/chessboardSvg";
import { resolvePageDimensions } from "../../src/components/targetgen/svg/paperConstants";
import type { TargetGeneratorState, ChessboardConfig } from "../../src/components/targetgen/types";

const A4_LANDSCAPE = {
    sizeKind: "a4" as const,
    customWidthMm: 210,
    customHeightMm: 297,
    orientation: "landscape" as const,
    marginMm: 10,
    pngDpi: 300,
    showScaleLine: true,
};

// Real desktop usage nests DownloadBar inside TargetConfigPanel's `w-80`
// right rail (src/pages/TargetGenerator.tsx), with `p-3` around it.
function Rail({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 320 }} className="border-l border-border bg-muted/20 p-3">
            {children}
        </div>
    );
}

export const Ready = () => {
    // Camera-cal 7x10 chessboard preset, rendered with the real synchronous
    // SVG generator and validated with the real validateConfig — a genuinely
    // settled, download-ready run.
    const config: ChessboardConfig = { innerRows: 7, innerCols: 10, squareSizeMm: 20, innerSquareRel: 0 };
    const target: TargetGeneratorState["target"] = { targetType: "chessboard", config };
    const state: TargetGeneratorState = {
        target,
        page: A4_LANDSCAPE,
        previewSvg: chessboardSvg(config, resolvePageDimensions(A4_LANDSCAPE)),
        validation: validateConfig(target, A4_LANDSCAPE),
        configCache: {},
    };
    return (
        <Rail>
            <DownloadBar state={state} />
        </Rail>
    );
};

export const Blocked = () => {
    // Board too large for the page — validateConfig raises a real "does not
    // fit the printable area" error, which disables every button.
    const config: ChessboardConfig = { innerRows: 9, innerCols: 13, squareSizeMm: 50, innerSquareRel: 0 };
    const target: TargetGeneratorState["target"] = { targetType: "chessboard", config };
    const state: TargetGeneratorState = {
        target,
        page: A4_LANDSCAPE,
        previewSvg: chessboardSvg(config, resolvePageDimensions(A4_LANDSCAPE)),
        validation: validateConfig(target, A4_LANDSCAPE),
        configCache: {},
    };
    return (
        <Rail>
            <DownloadBar state={state} />
        </Rail>
    );
};
