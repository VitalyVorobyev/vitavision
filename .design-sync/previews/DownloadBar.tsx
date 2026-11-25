import { DownloadBar } from "vitcv";
import { CHESSBOARD_PRESETS } from "../../src/components/targetgen/presets";
import type { ChessboardConfig } from "../../src/components/targetgen/types";
import { A4_LANDSCAPE, first, settledState } from "../fixtures/targetgen";

// Real desktop usage nests DownloadBar inside TargetConfigPanel's `w-80`
// right rail (src/pages/TargetGenerator.tsx), with `p-3` around it.
function Rail({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 320 }} className="border-l border-line bg-raised/20 p-3">
            {children}
        </div>
    );
}

export const Ready = () => {
    // The camera-calibration chessboard preset on A4: a settled, download-ready run.
    const preset = first(CHESSBOARD_PRESETS);
    return (
        <Rail>
            <DownloadBar state={settledState(preset.target, preset.page)} />
        </Rail>
    );
};

export const Blocked = () => {
    // Board too large for the page: the fit check reports "does not fit the printable
    // area", which disables every button.
    const config: ChessboardConfig = { innerRows: 9, innerCols: 13, squareSizeMm: 50, innerSquareRel: 0 };
    return (
        <Rail>
            <DownloadBar state={settledState({ targetType: "chessboard", config }, A4_LANDSCAPE)} />
        </Rail>
    );
};
