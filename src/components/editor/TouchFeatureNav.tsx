import { useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@vitavision/ui";
import { useShallow } from "zustand/react/shallow";

import { useEditorStore } from "../../store/editor/useEditorStore";
import { buildFeatureGroups } from "../../store/editor/featureGroups";
import useViewportMode from "../../hooks/useViewportMode";
import { useFeatureNav } from "./hooks/useFeatureNav";


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

    const { group, goPrev, goNext, position } = useFeatureNav(groups, selectedFeatureId, setSelectedFeatureId, true);

    const handleClear = useCallback(() => {
        if (features.length === 0) return;
        if (!window.confirm("Clear all features and reset the current results for this image?")) return;
        clearFeatures();
    }, [clearFeatures, features.length]);

    if (!isTouchPrimary || features.length === 0) return null;

    return (
        <div className="absolute bottom-14 left-3 z-20 flex items-center gap-0.5 rounded-control border border-line bg-surface/90 px-1 py-0.5 shadow-xs backdrop-blur-sm">
            <Button variant="ghost" size="md" className="size-11 px-0" onClick={goPrev} aria-label="Previous feature" icon={<ChevronLeft />} />

            <span className="min-w-[5rem] text-center text-xs font-medium select-none">
                {group && <span className="text-fg-muted">{group.label} </span>}
                <span className="tabular-nums">{position}</span>
            </span>

            <Button variant="ghost" size="md" className="size-11 px-0" onClick={goNext} aria-label="Next feature" icon={<ChevronRight />} />

            <div className="mx-0.5 h-5 w-px bg-line" />

            <Button variant="danger" size="md" className="size-11 px-0" onClick={handleClear} aria-label="Clear all features" icon={<Trash2 />} />
        </div>
    );
}
