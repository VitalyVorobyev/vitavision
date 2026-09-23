/**
 * Pure logic for the People co-author network (`components/people/network/**`).
 *
 * Kept dependency-free from React so it can be exercised directly in tests:
 * era filtering, alias resolution, search matching, focus-ring placement and
 * the greedy label-collision layout used by both the overview ("top 20" /
 * "all" labels) and the focused view (every co-author labelled).
 *
 * The focus-ring math and label-collision approach mirror the approved
 * design mockup (`mockgen.ts`, function `peopleNetwork`) — see comments below
 * for where behaviour intentionally matches it.
 */

import type { ScholarlyGroup, ScholarlyIndex, ScholarlyNetworkNode } from "./scholarlyTypes.ts";
import type { AuthorsIndex } from "../../generated/authors-index.ts";
import type { ViewportBounds } from "../graph/useViewport.ts";
import { GROUPS } from "./scholarlyGroups.ts";

/** Community → colour, derived from `GROUPS` (single source of truth for the palette). */
export const GROUP_COLOR: Record<ScholarlyGroup, string> = Object.fromEntries(
    GROUPS.map((g) => [g.group, g.color]),
) as Record<ScholarlyGroup, string>;

// ── Alias resolution ─────────────────────────────────────────────────────────

/**
 * Follows `aliases[id] -> canonicalId` until a fixed point, guarding against
 * a (should-never-happen) cycle. Returns `id` unchanged when it isn't an alias.
 */
export function resolveAuthorId(id: string, aliases: Record<string, string>): string {
    let current = id;
    const seen = new Set<string>();
    while (aliases[current] && !seen.has(current)) {
        seen.add(current);
        current = aliases[current];
    }
    return current;
}

// ── Era filter ───────────────────────────────────────────────────────────────

export type Era = "all" | "pre2000" | "2000-2011" | "2012plus";

export const ERA_OPTIONS: { value: Era; label: string }[] = [
    { value: "all", label: "All years" },
    { value: "pre2000", label: "Before 2000" },
    { value: "2000-2011", label: "2000–2011" },
    { value: "2012plus", label: "2012 onward" },
];

/** Whether an author's `[firstYear, lastYear]` span intersects the given era. */
export function eraIntersects(era: Era, firstYear: number, lastYear: number): boolean {
    switch (era) {
        case "all":
            return true;
        case "pre2000":
            return firstYear < 2000;
        case "2000-2011":
            return firstYear <= 2011 && lastYear >= 2000;
        case "2012plus":
            return lastYear >= 2012;
    }
}

// ── Label mode ───────────────────────────────────────────────────────────────

export type LabelMode = "top20" | "all" | "none";

export const LABEL_MODE_OPTIONS: { value: LabelMode; label: string }[] = [
    { value: "top20", label: "Top 20" },
    { value: "all", label: "All" },
    { value: "none", label: "None" },
];

export const OVERVIEW_LABEL_COUNT = 20;

// ── Search matching ──────────────────────────────────────────────────────────

/** Lowercase, diacritic-stripped comparison key (accent-insensitive matching). */
export function normalizeSearchText(s: string): string {
    return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}

export function matchesQuery(name: string, query: string): boolean {
    const q = normalizeSearchText(query.trim());
    if (!q) return false;
    return normalizeSearchText(name).includes(q);
}

export interface PersonSearchResult {
    id: string;
    name: string;
    pageCount: number;
}

/**
 * Matches the "Find a person" combobox query against every author present in
 * the network (i.e. `scholarly.authors`, which excludes authors with zero
 * Atlas-page contribution), sorted by page count then name, capped to `limit`.
 */
export function searchPeople(
    query: string,
    authorsIdx: Pick<AuthorsIndex, "authors">,
    scholarly: Pick<ScholarlyIndex, "authors">,
    limit = 8,
): PersonSearchResult[] {
    if (!query.trim()) return [];
    const out: PersonSearchResult[] = [];
    for (const [id, ref] of Object.entries(authorsIdx.authors)) {
        const person = scholarly.authors[id];
        if (!person) continue;
        if (!matchesQuery(ref.name, query)) continue;
        out.push({ id, name: ref.name, pageCount: person.pageCount });
    }
    out.sort((a, b) => b.pageCount - a.pageCount || a.name.localeCompare(b.name));
    return out.slice(0, limit);
}

// ── Node sizing / colour ─────────────────────────────────────────────────────

/** Radius (content px) for a node with the given Atlas page count. */
export function nodeRadius(pageCount: number): number {
    return 2.5 + Math.sqrt(Math.max(0, pageCount)) * 1.25;
}

// ── Co-author ties & focus rings ─────────────────────────────────────────────

export interface CoauthorTie {
    id: string;
    shared: number;
}

/** Co-authors of `focusId`, sorted by shared-paper count desc (ties by id for determinism). */
export function coauthorTies(coauthorPapers: ScholarlyIndex["coauthorPapers"], focusId: string): CoauthorTie[] {
    const map = coauthorPapers[focusId] ?? {};
    return Object.entries(map)
        .map(([id, papers]) => ({ id, shared: papers.length }))
        .sort((a, b) => b.shared - a.shared || a.id.localeCompare(b.id));
}

/** Ring radius (content px) for a tie strength — closer ring = more shared papers. */
export function ringRadius(shared: number): number {
    return shared >= 3 ? 70 : shared === 2 ? 110 : 150;
}

export interface FocusPosition {
    x: number;
    y: number;
}

/**
 * Positions `focusId` and its co-authors: the focus node keeps its real
 * network coordinate, co-authors fan out evenly around it on rings sized by
 * tie strength (see `ringRadius`), everyone else is left unpositioned here
 * (the caller falls back to the node's own `x`/`y`). Matches the ring fan-out
 * in the approved mockup (`mockgen.ts` `peopleNetwork`), reusing the same
 * angle-per-index spacing and slight ellipse (`* 1.25` on the x radius).
 */
export function computeFocusPositions(
    nodes: ScholarlyNetworkNode[],
    ties: CoauthorTie[],
    focusId: string,
): Map<string, FocusPosition> {
    const overrides = new Map<string, FocusPosition>();
    const focusNode = nodes.find((n) => n.id === focusId);
    if (!focusNode) return overrides;

    overrides.set(focusId, { x: focusNode.x, y: focusNode.y });

    const n = ties.length;
    ties.forEach((tie, i) => {
        const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2 + 0.2;
        const r = ringRadius(tie.shared);
        overrides.set(tie.id, {
            x: focusNode.x + Math.cos(angle) * r * 1.25,
            y: focusNode.y + Math.sin(angle) * r,
        });
    });

    return overrides;
}

/** Content-space box the camera should fit around a focused person (before ring padding). */
export function focusBounds(
    nodes: ScholarlyNetworkNode[],
    focusId: string,
    halfExtent = 220,
): ViewportBounds | null {
    const focusNode = nodes.find((n) => n.id === focusId);
    if (!focusNode) return null;
    return {
        minX: focusNode.x - halfExtent,
        minY: focusNode.y - halfExtent,
        maxX: focusNode.x + halfExtent,
        maxY: focusNode.y + halfExtent,
    };
}

// ── Label layout ─────────────────────────────────────────────────────────────

export interface LabelCandidate {
    id: string;
    x: number;
    y: number;
    radius: number;
    text: string;
    fontSize: number;
    /** Mandatory labels (the focus node + its co-authors) are always placed, best-effort. */
    mandatory?: boolean;
}

export interface PlacedLabel {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    mandatory: boolean;
}

type Box = [number, number, number, number];

function textWidth(text: string, fontSize: number): number {
    return text.length * fontSize * 0.56;
}

function boxesOverlap(a: Box, b: Box): boolean {
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

/**
 * Greedy label placement with bounding-box collision rejection — the same
 * approach as the approved design mockup (`mockgen.ts` `peopleNetwork`).
 * Candidates are placed in the given order, so callers sort by priority
 * (focus node, then strongest ties, then by page count). Four anchors are
 * tried per candidate — right of the node, left, below, above — in that
 * order; the first that both stays inside `canvas` and doesn't collide with
 * an already-placed (or `reserved`) box wins. `mandatory` candidates are
 * always placed even when every anchor collides — falling back to whichever
 * anchor overlaps the fewest already-placed boxes (ties broken by staying
 * inside `canvas`), rather than blindly the first, so two mandatory labels
 * forced into the same crowded corner don't land exactly on top of each
 * other — since every co-author must be labelled once a person is focused;
 * optional candidates are dropped instead.
 */
export function layoutLabels(candidates: LabelCandidate[], canvas: ViewportBounds, reserved: Box[] = []): PlacedLabel[] {
    const boxes: Box[] = [...reserved];
    const placed: PlacedLabel[] = [];

    const inCanvas = (box: Box) => box[0] >= canvas.minX && box[2] <= canvas.maxX && box[1] >= canvas.minY && box[3] <= canvas.maxY;

    for (const c of candidates) {
        const w = textWidth(c.text, c.fontSize);
        const h = c.fontSize;
        const anchors: { x: number; y: number }[] = [
            { x: c.x + c.radius + 4, y: c.y + c.fontSize * 0.35 }, // right
            { x: c.x - c.radius - 4 - w, y: c.y + c.fontSize * 0.35 }, // left
            { x: c.x - w / 2, y: c.y + c.radius + h }, // below
            { x: c.x - w / 2, y: c.y - c.radius - 4 }, // above
        ];

        let chosen: { x: number; y: number } | null = null;
        for (const a of anchors) {
            const box: Box = [a.x - 2, a.y - h, a.x + w + 2, a.y + 4];
            if (!inCanvas(box)) continue;
            if (boxes.some((q) => boxesOverlap(box, q))) continue;
            chosen = a;
            boxes.push(box);
            break;
        }

        if (!chosen && c.mandatory) {
            let bestScore = Infinity;
            for (const a of anchors) {
                const box: Box = [a.x - 2, a.y - h, a.x + w + 2, a.y + 4];
                const overlapCount = boxes.reduce((n, q) => n + (boxesOverlap(box, q) ? 1 : 0), 0);
                const score = overlapCount * 2 + (inCanvas(box) ? 0 : 1);
                if (score < bestScore) {
                    bestScore = score;
                    chosen = a;
                }
            }
            const box: Box = [chosen!.x - 2, chosen!.y - h, chosen!.x + w + 2, chosen!.y + 4];
            boxes.push(box);
        }

        if (chosen) {
            placed.push({ id: c.id, x: chosen.x, y: chosen.y, text: c.text, fontSize: c.fontSize, mandatory: !!c.mandatory });
        }
    }

    return placed;
}

/**
 * Corner rectangles reserved for the legend / minimap / focus-card overlays.
 * Those overlays have a FIXED screen-pixel footprint, so their content-space
 * size depends on the current fit scale — `contentPerScreenPx` (content
 * units per screen px, i.e. `1 / scale`) converts the (roughly estimated)
 * on-screen footprint of each overlay into `canvas`'s coordinate space. A
 * canvas-fraction approach would drastically over-reserve a small focus box
 * and under-reserve the full network's wide overview box.
 */
export function reservedLabelBoxes(canvas: ViewportBounds, focused: boolean, contentPerScreenPx = 1): Box[] {
    const px = (n: number) => n * contentPerScreenPx;
    const boxes: Box[] = [
        // Bottom-left legend (~210x150 screen px).
        [canvas.minX, canvas.maxY - px(150), canvas.minX + px(210), canvas.maxY],
        // Top-left minimap (desktop only, but reserving it costs nothing on phones; ~180x120 screen px).
        [canvas.minX, canvas.minY, canvas.minX + px(180), canvas.minY + px(120)],
    ];
    if (focused) {
        // Top-right focus card (~300x230 screen px rendered size, padded a
        // little further so a label's anchor point doesn't sit right at the
        // card's edge and get partly occluded by its opaque background).
        boxes.push([canvas.maxX - px(340), canvas.minY, canvas.maxX, canvas.minY + px(260)]);
    }
    return boxes;
}

export interface LabelPerson {
    id: string;
    name: string;
    pageCount: number;
    x: number;
    y: number;
}

/** Overview label candidates — top `limit` by page count (or all / none per `labelMode`). */
export function selectOverviewLabelCandidates(
    people: LabelPerson[],
    labelMode: LabelMode,
    limit = OVERVIEW_LABEL_COUNT,
): LabelCandidate[] {
    if (labelMode === "none") return [];
    const sorted = [...people].sort((a, b) => b.pageCount - a.pageCount || a.name.localeCompare(b.name));
    const chosen = labelMode === "all" ? sorted : sorted.slice(0, limit);
    return chosen.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        radius: nodeRadius(p.pageCount),
        text: p.name,
        fontSize: 11.5,
        mandatory: false,
    }));
}

/**
 * Focus label candidates: the focus node and every co-author are mandatory
 * (always labelled); a handful of additional high-page-count people are
 * added as optional context labels, capped by `labelMode`.
 */
export function selectFocusLabelCandidates(
    people: LabelPerson[],
    focusId: string,
    ties: CoauthorTie[],
    labelMode: LabelMode,
    extraLimit = 8,
): LabelCandidate[] {
    const byId = new Map(people.map((p) => [p.id, p]));
    const tieIds = new Set(ties.map((t) => t.id));
    const out: LabelCandidate[] = [];

    const focusPerson = byId.get(focusId);
    if (focusPerson) {
        out.push({
            id: focusId,
            x: focusPerson.x,
            y: focusPerson.y,
            radius: nodeRadius(focusPerson.pageCount),
            text: focusPerson.name,
            fontSize: 15,
            mandatory: true,
        });
    }

    for (const tie of ties) {
        const p = byId.get(tie.id);
        if (!p) continue;
        out.push({
            id: p.id,
            x: p.x,
            y: p.y,
            radius: nodeRadius(p.pageCount),
            text: p.name,
            fontSize: 12.5,
            mandatory: true,
        });
    }

    if (labelMode !== "none") {
        const rest = people
            .filter((p) => p.id !== focusId && !tieIds.has(p.id))
            .sort((a, b) => b.pageCount - a.pageCount || a.name.localeCompare(b.name));
        const cap = labelMode === "all" ? 40 : extraLimit;
        for (const p of rest.slice(0, cap)) {
            out.push({
                id: p.id,
                x: p.x,
                y: p.y,
                radius: nodeRadius(p.pageCount),
                text: p.name,
                fontSize: 11.5,
                mandatory: false,
            });
        }
    }

    return out;
}
