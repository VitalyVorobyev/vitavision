import { useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useEditorStore } from "../../store/editor/useEditorStore";
import { buildFeatureGroups } from "../../store/editor/featureGroups";
import useViewportMode from "../../hooks/useViewportMode";

const NAV_BTN =
    "flex min-w-[44px] min-h-[44px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/30 active:bg-muted/50";

export default function TouchFeatureNav() {
    const { isTouchPrimary } = useViewportMode();

    const { features, selectedFeatureId, setSelectedFeatureId, clearFeatures } =
        useEditorStore(useShallow((s) => ({
            features: s.features,
            selectedFeatureId: s.selectedFeatureId,
            setSelectedFeatureId: s.setSelectedFeatureId,
            clearFeatures: s.clearFeatures,
        })));

    const groups = useMemo(() => buildFeatureGroups(features), [features]);

    const activeGroupIndex = useMemo(() => {
        if (!selectedFeatureId) return groups.length > 0 ? 0 : -1;
        return groups.findIndex((g) => g.features.some((f) => f.id === selectedFeatureId));
    }, [groups, selectedFeatureId]);

    const group = activeGroupIndex >= 0 ? groups[activeGroupIndex] : null;

    const indexInGroup = useMemo(() => {
        if (!group || !selectedFeatureId) return -1;
        return group.features.findIndex((f) => f.id === selectedFeatureId);
    }, [group, selectedFeatureId]);

    const ids = useMemo(() => group?.features.map((f) => f.id) ?? [], [group]);
    const total = ids.length;

    const goPrev = useCallback(() => {
        if (total === 0) return;
        const next = indexInGroup > 0 ? indexInGroup - 1 : total - 1;
        setSelectedFeatureId(ids[next]);
    }, [indexInGroup, total, ids, setSelectedFeatureId]);

    const goNext = useCallback(() => {
        if (total === 0) return;
        const next = indexInGroup < total - 1 ? indexInGroup + 1 : 0;
        setSelectedFeatureId(ids[next]);
    }, [indexInGroup, total, ids, setSelectedFeatureId]);

    const handleClear = useCallback(() => {
        if (features.length === 0) return;
        if (!window.confirm("Clear all features and reset the current results for this image?")) return;
        clearFeatures();
    }, [clearFeatures, features.length]);

    if (!isTouchPrimary || features.length === 0) return null;

    const display = indexInGroup >= 0
        ? `${indexInGroup + 1} / ${total}`
        : `— / ${total}`;

    return (
        <div className="absolute bottom-14 left-3 z-20 flex items-center gap-0.5 rounded-md border border-border bg-background/90 px-1 py-0.5 shadow-xs backdrop-blur-sm">
            <button type="button" onClick={goPrev} className={NAV_BTN} title="Previous feature">
                <ChevronLeft size={18} />
            </button>

            <span className="min-w-[5rem] text-center text-xs font-medium select-none">
                {group && <span className="text-muted-foreground">{group.label} </span>}
                <span className="tabular-nums">{display}</span>
            </span>

            <button type="button" onClick={goNext} className={NAV_BTN} title="Next feature">
                <ChevronRight size={18} />
            </button>

            <div className="mx-0.5 h-5 w-px bg-border" />

            <button
                type="button"
                onClick={handleClear}
                className={`${NAV_BTN} text-destructive hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20`}
                title="Clear all features"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}
