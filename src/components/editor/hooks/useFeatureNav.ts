import { useCallback, useMemo } from "react";

import type { FeatureGroup } from "../../../store/editor/featureGroups";

/**
 * Stepping through the features of the group the selection is in: which group that is, the
 * selection's place in it, and previous / next that wrap around.
 *
 * @param groups - The feature groups, in display order.
 * @param selectedFeatureId - The selected feature, or `null`.
 * @param select - Select a feature by id.
 * @param startsAtFirstGroup - With nothing selected, treat the first group as the active one
 *   (the touch navigator shows a position before anything is picked); otherwise there is none.
 */
export function useFeatureNav(
    groups: FeatureGroup[],
    selectedFeatureId: string | null,
    select: (id: string) => void,
    startsAtFirstGroup = false,
) {
    const activeGroupIndex = useMemo(() => {
        if (!selectedFeatureId) return startsAtFirstGroup && groups.length > 0 ? 0 : -1;
        return groups.findIndex((g) => g.features.some((f) => f.id === selectedFeatureId));
    }, [groups, selectedFeatureId, startsAtFirstGroup]);

    const group = activeGroupIndex >= 0 ? (groups[activeGroupIndex] ?? null) : null;

    const indexInGroup = useMemo(() => {
        if (!group || !selectedFeatureId) return -1;
        return group.features.findIndex((f) => f.id === selectedFeatureId);
    }, [group, selectedFeatureId]);

    const ids = useMemo(() => group?.features.map((f) => f.id) ?? [], [group]);
    const total = ids.length;

    const step = useCallback(
        (next: number) => {
            const id = ids[next];
            if (id !== undefined) select(id);
        },
        [ids, select],
    );
    const goPrev = useCallback(() => {
        if (total > 0) step(indexInGroup > 0 ? indexInGroup - 1 : total - 1);
    }, [indexInGroup, total, step]);
    const goNext = useCallback(() => {
        if (total > 0) step(indexInGroup < total - 1 ? indexInGroup + 1 : 0);
    }, [indexInGroup, total, step]);

    /** "3 / 40", or "— / 40" while the selection is not in the group. */
    const position = indexInGroup >= 0 ? `${indexInGroup + 1} / ${total}` : `— / ${total}`;

    return { activeGroupIndex, group, indexInGroup, total, goPrev, goNext, position };
}
