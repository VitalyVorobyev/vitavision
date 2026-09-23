// useNetworkLayout — derives all the per-render graph data PeopleNetwork
// needs: normalized node/edge coordinates, the focused person (alias
// resolved) and their co-author ties, ring-overridden positions, adjacency,
// and render-ready node styling. Kept out of PeopleNetwork.tsx so that
// component can stay focused on wiring the viewport + overlays together.
// Does NOT touch `useViewport` — the camera box it returns (`cameraBounds`)
// is what the caller feeds into that hook.

import { useMemo } from "react";
import type { ScholarlyIndex } from "../../../lib/atlas/scholarlyTypes.ts";
import type { AuthorsIndex } from "../../../generated/authors-index.ts";
import type { ViewportBounds } from "../../../lib/graph/useViewport.ts";
import {
    GROUP_COLOR,
    coauthorTies,
    computeFocusPositions,
    eraIntersects,
    focusBounds,
    nodeRadius,
    resolveAuthorId,
    type Era,
    type LabelPerson,
} from "../../../lib/atlas/peopleNetwork.ts";
import type { RenderNode } from "./NetworkNodes.tsx";
import type { NetworkPoint } from "./networkTypes.ts";

const EMPTY_BOUNDS: ViewportBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
const FOCUS_HALF_EXTENT = 300;

export interface UseNetworkLayoutArgs {
    scholarly: ScholarlyIndex | null;
    authorsIdx: AuthorsIndex;
    focusId: string | undefined;
    era: Era;
}

export function useNetworkLayout({ scholarly, authorsIdx, focusId, era }: UseNetworkLayoutArgs) {
    // Resolve an alias id (e.g. from a deep link) to its canonical id.
    const effectiveFocusId = focusId ? resolveAuthorId(focusId, authorsIdx.aliases) : undefined;

    // Normalize node coordinates to a [0,W]x[0,H] space (shifted by the raw
    // network bounds' own minX/minY). `useViewport`'s pan/zoom math assumes
    // plane-local pixels equal content coordinates directly, with no extra
    // renormalization — the same convention GraphExplorer's `layoutBounds`
    // already follows. The raw scholarly-index coordinates are NOT
    // zero-based (they range roughly -565..503), so this shift keeps that
    // assumption true instead of fighting it with an SVG viewBox offset.
    const rawBounds = scholarly?.network.bounds;
    const originX = rawBounds?.minX ?? 0;
    const originY = rawBounds?.minY ?? 0;
    const nodes = useMemo(
        () => (scholarly?.network.nodes ?? []).map((n) => ({ id: n.id, x: n.x - originX, y: n.y - originY })),
        [scholarly, originX, originY],
    );
    const edges = useMemo(() => scholarly?.network.edges ?? [], [scholarly]);
    const bounds: ViewportBounds = useMemo(
        () => (rawBounds ? { minX: 0, minY: 0, maxX: rawBounds.maxX - originX, maxY: rawBounds.maxY - originY } : EMPTY_BOUNDS),
        [rawBounds, originX, originY],
    );

    const focusPerson = effectiveFocusId ? scholarly?.authors[effectiveFocusId] : undefined;
    const activeFocusId = effectiveFocusId && focusPerson ? effectiveFocusId : undefined;

    const ties = useMemo(
        () => (activeFocusId && scholarly ? coauthorTies(scholarly.coauthorPapers, activeFocusId) : []),
        [scholarly, activeFocusId],
    );
    const ringIds = useMemo(() => new Set(ties.map((t) => t.id)), [ties]);
    const hotIds = useMemo(
        () => (activeFocusId ? new Set([activeFocusId, ...ties.map((t) => t.id)]) : new Set<string>()),
        [activeFocusId, ties],
    );

    const focusOverrides = useMemo(
        () => (activeFocusId ? computeFocusPositions(nodes, ties, activeFocusId) : new Map<string, NetworkPoint>()),
        [nodes, ties, activeFocusId],
    );
    const positions = useMemo(() => {
        const m = new Map<string, NetworkPoint>();
        for (const n of nodes) m.set(n.id, focusOverrides.get(n.id) ?? { x: n.x, y: n.y });
        return m;
    }, [nodes, focusOverrides]);

    const adjacency = useMemo(() => {
        const m = new Map<string, { peer: string; shared: number }[]>();
        for (const [a, b, shared] of edges) {
            (m.get(a) ?? m.set(a, []).get(a)!).push({ peer: b, shared });
            (m.get(b) ?? m.set(b, []).get(b)!).push({ peer: a, shared });
        }
        return m;
    }, [edges]);

    const renderNodes = useMemo<RenderNode[]>(() => {
        const list = nodes.map((n) => {
            const person = scholarly?.authors[n.id];
            const pos = positions.get(n.id) ?? n;
            const isHot = !activeFocusId || hotIds.has(n.id);
            const eraOk = person ? eraIntersects(era, person.firstYear, person.lastYear) : true;
            let opacity = isHot ? 1 : 0.22;
            if (!eraOk) opacity *= 0.3;
            return {
                id: n.id,
                name: authorsIdx.authors[n.id]?.name ?? n.id,
                x: pos.x,
                y: pos.y,
                radius: nodeRadius(person?.pageCount ?? 0),
                color: GROUP_COLOR[person?.group ?? "other"],
                opacity,
                isFocus: n.id === activeFocusId,
            };
        });
        list.sort((a, b) => a.opacity - b.opacity);
        return list;
    }, [nodes, scholarly, positions, activeFocusId, hotIds, era, authorsIdx]);

    const labelPeople = useMemo<LabelPerson[]>(
        () =>
            nodes.map((n) => {
                const p = positions.get(n.id) ?? n;
                return {
                    id: n.id,
                    name: authorsIdx.authors[n.id]?.name ?? n.id,
                    pageCount: scholarly?.authors[n.id]?.pageCount ?? 0,
                    x: p.x,
                    y: p.y,
                };
            }),
        [nodes, positions, authorsIdx, scholarly],
    );

    // Camera target box: the whole network when unfocused, a tight box
    // around the focused person when focused.
    const focusBox = useMemo(
        () => (activeFocusId ? focusBounds(nodes, activeFocusId, FOCUS_HALF_EXTENT) : null),
        [nodes, activeFocusId],
    );
    const cameraBounds = focusBox ?? bounds;

    return {
        effectiveFocusId,
        activeFocusId,
        focusPerson,
        nodes,
        edges,
        bounds,
        ties,
        ringIds,
        hotIds,
        positions,
        adjacency,
        renderNodes,
        labelPeople,
        cameraBounds,
    };
}
