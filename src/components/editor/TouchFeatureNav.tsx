import { useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@vitavision/ui";
import { useShallow } from "zustand/react/shallow";

import { useEditorStore } from "../../store/editor/useEditorStore";
import { buildFeatureGroups } from "../../store/editor/featureGroups";
import useViewportMode from "../../hooks/useViewportMode";


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
        <div className="absolute bottom-14 left-3 z-20 flex items-center gap-0.5 rounded-control border border-line bg-surface/90 px-1 py-0.5 shadow-xs backdrop-blur-sm">
            <Button variant="ghost" size="md" className="size-11 px-0" onClick={goPrev} aria-label="Previous feature" icon={<ChevronLeft />} />

            <span className="min-w-[5rem] text-center text-xs font-medium select-none">
                {group && <span className="text-fg-muted">{group.label} </span>}
                <span className="tabular-nums">{display}</span>
            </span>

            <Button variant="ghost" size="md" className="size-11 px-0" onClick={goNext} aria-label="Next feature" icon={<ChevronRight />} />

            <div className="mx-0.5 h-5 w-px bg-line" />

            <Button variant="danger" size="md" className="size-11 px-0" onClick={handleClear} aria-label="Clear all features" icon={<Trash2 />} />
        </div>
    );
}
