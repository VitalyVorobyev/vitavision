import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { useEditorStore } from "../../../../store/editor/useEditorStore";
import { decodeImageUrl } from "../../../../lib/wasm/imageDecoder";
import { generateRadsymHeatmap } from "../../../../lib/wasm/wasmWorkerProxy";

/**
 * Triggers heatmap generation whenever the last algorithm result is a radsym run.
 * Clears heatmap data when the algorithm changes or image changes.
 */
export function useRadsymHeatmap() {
    const { lastAlgorithmResult, imageSrc, setHeatmapData } = useEditorStore(useShallow((s) => ({
        lastAlgorithmResult: s.lastAlgorithmResult,
        imageSrc: s.imageSrc,
        setHeatmapData: s.setHeatmapData,
    })));

    useEffect(() => {
        if (lastAlgorithmResult?.algorithmId !== "radsym" || !imageSrc) {
            setHeatmapData(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const { pixels, width, height } = await decodeImageUrl(imageSrc);
                if (cancelled) return;

                // Extract radsym config from the result to match detection parameters
                const result = lastAlgorithmResult.result as Record<string, unknown>;
                const config = (result as { _heatmapConfig?: unknown })._heatmapConfig ?? {};

                const heatmap = await generateRadsymHeatmap(pixels, width, height, config);
                if (cancelled) return;

                setHeatmapData(heatmap);
            } catch {
                if (!cancelled) setHeatmapData(null);
            }
        })();

        return () => { cancelled = true; };
    }, [lastAlgorithmResult, imageSrc, setHeatmapData]);
}
