import { useReducer } from "react";
import { PaperConfig } from "vitcv";
import { targetGeneratorReducer } from "../../src/components/targetgen/reducer";
import type { TargetGeneratorState } from "../../src/components/targetgen/types";

const BASE_TARGET: TargetGeneratorState["target"] = {
    targetType: "chessboard",
    config: { innerRows: 7, innerCols: 10, squareSizeMm: 20, innerSquareRel: 0 },
};

function useConfiguredPage(page: TargetGeneratorState["page"]) {
    const [state, dispatch] = useReducer(targetGeneratorReducer, {
        target: BASE_TARGET,
        page,
        previewSvg: "",
        validation: { errors: [], warnings: [] },
        configCache: {},
    } satisfies TargetGeneratorState);
    return { page: state.page, dispatch };
}

// Real desktop usage nests this inside TargetConfigPanel's right rail
// (`w-80 border-l border-border bg-muted/20`, `p-3` inner gap).
function Rail({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: 320 }} className="border-l border-border bg-muted/20 p-3">
            {children}
        </div>
    );
}

export const A4Landscape = () => {
    const { page, dispatch } = useConfiguredPage({
        sizeKind: "a4",
        customWidthMm: 210,
        customHeightMm: 297,
        orientation: "landscape",
        marginMm: 10,
        pngDpi: 300,
        showScaleLine: true,
    });
    return (
        <Rail>
            <PaperConfig page={page} dispatch={dispatch} />
        </Rail>
    );
};

export const LetterPortrait = () => {
    const { page, dispatch } = useConfiguredPage({
        sizeKind: "letter",
        customWidthMm: 215.9,
        customHeightMm: 279.4,
        orientation: "portrait",
        marginMm: 15,
        pngDpi: 600,
        showScaleLine: false,
    });
    return (
        <Rail>
            <PaperConfig page={page} dispatch={dispatch} />
        </Rail>
    );
};

export const CustomSize = () => {
    const { page, dispatch } = useConfiguredPage({
        sizeKind: "custom",
        customWidthMm: 350,
        customHeightMm: 250,
        orientation: "landscape",
        marginMm: 20,
        pngDpi: 300,
        showScaleLine: true,
    });
    return (
        <Rail>
            <PaperConfig page={page} dispatch={dispatch} />
        </Rail>
    );
};
