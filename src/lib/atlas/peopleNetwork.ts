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

/** Base ring radius (content px) for a tie strength, before the tie-count scale
 *  and minimum-arc-spacing bump in `computeRingLayout` — closer ring = more shared papers. */
export function ringRadius(shared: number): number {
    return shared >= 3 ? 70 : shared === 2 ? 110 : 150;
}

/**
 * Scale factor applied to every ring's base radius so a high-degree focus
 * (dozens of ties) gets visibly bigger rings than a low-degree one, per
 * `ringRadius ∝ max(1, sqrt(n/16))` — 16 ties is roughly where the base
 * radii already give comfortable spacing, so the scale is a no-op at and
 * below that and grows past it.
 */
export function ringRadiusScale(tieCount: number): number {
    return Math.max(1, Math.sqrt(tieCount / 16));
}

/**
 * Minimum straight-line spacing (content px) kept between adjacent same-ring
 * node centers, regardless of tie count. Sized for a name-length label at a
 * TYPICAL zoomed-out focus scale (content-space label sizes scale with
 * `contentPerScreenPx`, which this ring-layout math can't see — it runs
 * before the camera fit exists — so this is a fixed, generously-sized
 * estimate rather than an exact figure). Reduces, but doesn't eliminate,
 * label crowding on the very densest rings (dozens of ties) squeezed onto a
 * narrow (phone) canvas — `PeopleNetwork` also shrinks the label BUDGET on
 * phones for the same reason.
 */
const MIN_RING_ARC_SPACING = 70;

/** Radius that gives `count` evenly-spaced points at least `MIN_RING_ARC_SPACING` apart. */
function ringRadiusForSpacing(baseRadius: number, count: number, scale: number): number {
    const scaled = baseRadius * scale;
    if (count <= 1) return scaled;
    const neededForSpacing = (count * MIN_RING_ARC_SPACING) / (2 * Math.PI);
    return Math.max(scaled, neededForSpacing);
}

export interface FocusPosition {
    x: number;
    y: number;
}

/** Angle (radians) of the `i`th of `n` ring slots, used by `computeRingLayout`. */
export function ringAngle(index: number, total: number): number {
    return (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2 + 0.2;
}

export interface RingSlot {
    /** Offset from the focus node (NOT an absolute position). */
    x: number;
    y: number;
    angle: number;
    radius: number;
}

/**
 * Lays out every tie on one of three concentric rings by tie strength
 * (>=3 / 2 / 1 shared papers), each ring's radius scaled by tie count (see
 * `ringRadiusScale`) and bumped further if needed so same-ring neighbors
 * keep `MIN_RING_ARC_SPACING` apart — so a 40-tie focus gets visibly bigger,
 * roomier rings than a 5-tie one instead of everyone crowding the same fixed
 * radii. Positions/angles are computed independently per ring (not by global
 * index across all ties), so each ring's own members are evenly spread
 * around their own full circle. Offsets are relative to the focus node —
 * `computeFocusPositions` adds the focus node's own coordinate.
 *
 * (A per-tier angular phase offset — staggering which direction each ring
 * starts from — was tried here to reduce inner/outer-ring label proximity,
 * but measured net WORSE on the real dataset: it cleared some overlaps at
 * the cost of introducing new ones elsewhere, including on the desktop/16-tie
 * case that was previously clean. Left out; see the label-budget reduction
 * in `PeopleNetwork.tsx` for phone's mitigation instead.)
 */
export function computeRingLayout(ties: CoauthorTie[]): Map<string, RingSlot> {
    const scale = ringRadiusScale(ties.length);
    const tiers: [number, CoauthorTie[]][] = [
        [ringRadius(3), ties.filter((t) => t.shared >= 3)],
        [ringRadius(2), ties.filter((t) => t.shared === 2)],
        [ringRadius(1), ties.filter((t) => t.shared === 1)],
    ];

    const out = new Map<string, RingSlot>();
    for (const [baseRadius, tierTies] of tiers) {
        const radius = ringRadiusForSpacing(baseRadius, tierTies.length, scale);
        tierTies.forEach((tie, i) => {
            const angle = ringAngle(i, tierTies.length);
            out.set(tie.id, {
                x: Math.cos(angle) * radius * 1.25,
                y: Math.sin(angle) * radius,
                angle,
                radius,
            });
        });
    }
    return out;
}

/**
 * Positions `focusId` and its co-authors: the focus node keeps its real
 * network coordinate, co-authors fan out on rings sized by tie strength AND
 * tie count (see `computeRingLayout`), everyone else is left unpositioned
 * here (the caller falls back to the node's own `x`/`y`). Matches the ring
 * fan-out in the approved mockup (`mockgen.ts` `peopleNetwork`).
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

    for (const [id, slot] of computeRingLayout(ties)) {
        overrides.set(id, { x: focusNode.x + slot.x, y: focusNode.y + slot.y });
    }

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

/**
 * Half-extent the camera fit should use for a focused person — grows with
 * the actual ring layout (see `computeRingLayout`) so a high-degree focus's
 * bigger rings still fit the frame, instead of a fixed box that only suited
 * the base (un-scaled) ring radii. `+90` leaves headroom for ring labels,
 * which sit just outside their node.
 */
export function focusHalfExtent(ties: CoauthorTie[], base = 220): number {
    let maxAbsX = 0;
    let maxAbsY = 0;
    for (const slot of computeRingLayout(ties).values()) {
        maxAbsX = Math.max(maxAbsX, Math.abs(slot.x));
        maxAbsY = Math.max(maxAbsY, Math.abs(slot.y));
    }
    return Math.max(base, maxAbsX + 90, maxAbsY + 90);
}

/**
 * Biases the camera-fit box away from whichever fixed-position overlay would
 * otherwise sit on top of it, by extending the box on the far side (adding
 * "phantom" empty content space there) before it's centered by
 * `useViewport`'s fit math. Centering a box that's bigger on one side pushes
 * the REAL content toward the opposite side — e.g. extending `maxY` moves
 * real content up. Applied only to the box fed to the camera fit; label
 * placement keeps using the unbiased box so labels never drift into the
 * phantom region (which is exactly where the overlay ends up on screen).
 *
 * Overview: the minimap (top-left) and legend (bottom-left) both sit on the
 * left edge, so content is pushed right. Focused: the details card sits
 * bottom-center on phones (a sheet) or top-right on desktop, so content is
 * pushed up (phone) or left (desktop).
 */
export function cameraFitBounds(cameraBounds: ViewportBounds, isPhone: boolean, focused: boolean): ViewportBounds {
    const w = cameraBounds.maxX - cameraBounds.minX;
    const h = cameraBounds.maxY - cameraBounds.minY;
    if (!focused) {
        return { ...cameraBounds, minX: cameraBounds.minX - w * 0.3 };
    }
    if (isPhone) {
        return { ...cameraBounds, maxY: cameraBounds.maxY + h * 0.5 };
    }
    return { ...cameraBounds, maxX: cameraBounds.maxX + w * 0.3 };
}

// ── Label layout ─────────────────────────────────────────────────────────────

export interface LabelCandidate {
    id: string;
    x: number;
    y: number;
    radius: number;
    text: string;
    /** Desired on-screen size in px — text is rendered screen-constant (divided by the
     *  live zoom scale), so this is NOT a content-space unit; see `layoutLabels`'s
     *  `contentPerScreenPx` param for how it's converted for collision math. */
    fontSize: number;
    /** Mandatory labels (the focus node + its co-authors) are always placed, best-effort. */
    mandatory?: boolean;
}

export interface PlacedLabel {
    id: string;
    x: number;
    y: number;
    text: string;
    /** Same screen-px value as the candidate's `fontSize` — the renderer divides by the
     *  live zoom scale so text stays a constant size on screen at any zoom level. */
    fontSize: number;
    mandatory: boolean;
}

type Box = [number, number, number, number];

// Per-character width as a multiple of font size — a deliberately generous
// estimate (real Inter glyphs average narrower) since this only feeds
// collision math: overestimating wastes a little placement margin,
// underestimating lets two labels render close enough to visually touch.
const CHAR_WIDTH_FACTOR = 0.62;

function textWidth(text: string, fontSize: number): number {
    return text.length * fontSize * CHAR_WIDTH_FACTOR;
}

function boxesOverlap(a: Box, b: Box): boolean {
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function labelBox(x: number, y: number, w: number, h: number): Box {
    return [x - 2, y - h, x + w + 2, y + 4];
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
 * inside `canvas`), rather than blindly the first; a final pass then nudges
 * any mandatory labels that STILL collide with each other directly apart
 * (see `nudgeApartMandatoryOverlaps`) until clear — since every co-author
 * must be labelled once a person is focused, two of them must never render
 * on top of each other. Optional candidates are dropped instead of ever forced.
 *
 * `contentPerScreenPx` (content units per screen px, i.e. `1 / scale`)
 * converts each candidate's screen-px `fontSize` and the small fixed gaps
 * (4px node clearance, 2px box padding) into `canvas`'s coordinate space —
 * labels render screen-constant, but collision math happens in content
 * space, so it needs to reason in screen-equivalent sizes there too.
 */
export function layoutLabels(
    candidates: LabelCandidate[],
    canvas: ViewportBounds,
    reserved: Box[] = [],
    contentPerScreenPx = 1,
): PlacedLabel[] {
    const px = (n: number) => n * contentPerScreenPx;
    const boxes: Box[] = [...reserved];
    const placed: PlacedLabel[] = [];

    const inCanvas = (box: Box) => box[0] >= canvas.minX && box[2] <= canvas.maxX && box[1] >= canvas.minY && box[3] <= canvas.maxY;

    for (const c of candidates) {
        const w = textWidth(c.text, px(c.fontSize));
        const h = px(c.fontSize);
        const gap = px(4);
        const anchors: { x: number; y: number }[] = [
            { x: c.x + c.radius + gap, y: c.y + h * 0.35 }, // right
            { x: c.x - c.radius - gap - w, y: c.y + h * 0.35 }, // left
            { x: c.x - w / 2, y: c.y + c.radius + h }, // below
            { x: c.x - w / 2, y: c.y - c.radius - gap }, // above
        ];

        let chosen: { x: number; y: number } | null = null;
        for (const a of anchors) {
            const box = labelBox(a.x, a.y, w, h);
            if (!inCanvas(box)) continue;
            if (boxes.some((q) => boxesOverlap(box, q))) continue;
            chosen = a;
            boxes.push(box);
            break;
        }

        if (!chosen && c.mandatory) {
            let bestScore = Infinity;
            for (const a of anchors) {
                const box = labelBox(a.x, a.y, w, h);
                const overlapCount = boxes.reduce((n, q) => n + (boxesOverlap(box, q) ? 1 : 0), 0);
                const score = overlapCount * 2 + (inCanvas(box) ? 0 : 1);
                if (score < bestScore) {
                    bestScore = score;
                    chosen = a;
                }
            }
            // A mandatory label is always placed even when its best anchor still
            // falls outside `canvas` — clamp it back in rather than let it render
            // clipped by the frame (the ring spacing `computeRingLayout` gives
            // mandatory candidates is what should make this rare, not a license
            // to hang labels off the edge when it isn't quite enough).
            chosen = clampAnchorToCanvas(chosen!, w, h, canvas);
            boxes.push(labelBox(chosen.x, chosen.y, w, h));
        }

        if (chosen) {
            placed.push({ id: c.id, x: chosen.x, y: chosen.y, text: c.text, fontSize: c.fontSize, mandatory: !!c.mandatory });
        }
    }

    nudgeApartMandatoryOverlaps(placed, contentPerScreenPx, canvas);

    return placed;
}

function clampAnchorToCanvas(a: { x: number; y: number }, w: number, h: number, canvas: ViewportBounds): { x: number; y: number } {
    let x = a.x;
    let y = a.y;
    if (x - 2 < canvas.minX) x = canvas.minX + 2;
    if (x + w + 2 > canvas.maxX) x = canvas.maxX - w - 2;
    if (y - h < canvas.minY) y = canvas.minY + h;
    if (y + 4 > canvas.maxY) y = canvas.maxY - 4;
    return { x, y };
}

/**
 * Final polish pass: repeatedly finds any two MANDATORY placed labels whose
 * boxes still overlap (the anchor fallback above minimizes but doesn't
 * guarantee zero collisions in a crowded ring) and nudges them directly
 * apart — along the vector between their box centers — a few content-px per
 * iteration. That direction (rather than each label's fixed ring tangent)
 * is what actually separates them regardless of collision geometry: same-
 * ring neighbors' centers are already roughly tangential to each other, but
 * a collision between an inner-ring and an outer-ring label (different tiers,
 * so their fixed tangents point in unrelated directions) needs the real
 * geometric separating direction, not a tangent that may barely help or even
 * push them further into each other. Each label's total displacement is
 * capped at roughly two label-heights (its own `fontSize`, converted to
 * content space) so a label never drifts far from its node: once a label
 * hits its budget it stops moving (the OTHER label in a still-colliding pair
 * may keep moving if it has budget left), and the ring spacing from
 * `computeRingLayout` — not this pass — is what should make room in the
 * first place. A three-(or more-)way jam needs more passes than a simple
 * pairwise nudge to fully untangle (resolving A-B can re-touch A-C), hence
 * the relatively generous iteration count below — each pass is cheap
 * (bounded by the small mandatory-label count, never the full ring).
 */
function nudgeApartMandatoryOverlaps(placed: PlacedLabel[], contentPerScreenPx: number, canvas: ViewportBounds): void {
    const step = 4 * contentPerScreenPx;
    const boxOf = (p: PlacedLabel) => {
        const px = p.fontSize * contentPerScreenPx;
        return labelBox(p.x, p.y, textWidth(p.text, px), px);
    };
    const centerOf = (box: Box) => ({ x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2 });
    const budget = new Map(placed.map((p) => [p.id, 4 * p.fontSize * contentPerScreenPx]));

    for (let iter = 0; iter < 50; iter++) {
        let movedAny = false;
        for (let i = 0; i < placed.length; i++) {
            if (!placed[i].mandatory) continue;
            for (let j = i + 1; j < placed.length; j++) {
                if (!placed[j].mandatory) continue;
                const a = placed[i];
                const b = placed[j];
                const boxA = boxOf(a);
                const boxB = boxOf(b);
                if (!boxesOverlap(boxA, boxB)) continue;

                const ca = centerOf(boxA);
                const cb = centerOf(boxB);
                let dx = cb.x - ca.x;
                let dy = cb.y - ca.y;
                const len = Math.hypot(dx, dy);
                if (len < 0.01) {
                    // Exactly co-located (rare) — pick an arbitrary direction.
                    dx = 1;
                    dy = 0;
                } else {
                    dx /= len;
                    dy /= len;
                }

                const aBudget = budget.get(a.id)!;
                const bBudget = budget.get(b.id)!;
                const aStep = Math.min(step, aBudget);
                const bStep = Math.min(step, bBudget);
                if (aStep > 0) {
                    a.x -= dx * aStep;
                    a.y -= dy * aStep;
                    budget.set(a.id, aBudget - aStep);
                    movedAny = true;
                }
                if (bStep > 0) {
                    b.x += dx * bStep;
                    b.y += dy * bStep;
                    budget.set(b.id, bBudget - bStep);
                    movedAny = true;
                }
            }
        }
        if (!movedAny) break;
    }

    // Nudging can push a label past the frame even though its original anchor
    // didn't — clamp back in as a last step (never re-introduces overlap with
    // itself; a residual overlap with a neighbor here is the rare, accepted
    // trade-off once both the ring spacing and the nudge budget are spent).
    for (const p of placed) {
        if (!p.mandatory) continue;
        const px = p.fontSize * contentPerScreenPx;
        const w = textWidth(p.text, px);
        const clamped = clampAnchorToCanvas({ x: p.x, y: p.y }, w, px, canvas);
        p.x = clamped.x;
        p.y = clamped.y;
    }
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

/** Default cap on mandatory tie labels (the focus node's own label counts against it too). */
export const FOCUS_LABEL_BUDGET = 16;

/**
 * Splits ties into `labelled` (always the focus node's co-authors with >= 2
 * shared papers, plus as many single-paper ties — in ring order, i.e. the
 * same order `coauthorTies` sorts them in — as fit under `budget` total
 * mandatory labels including the focus node's own) and `unlabelled` (the
 * rest — still drawn on the ring, just not labelled by default; shown on
 * hover/tap instead so a 40-tie focus doesn't force-label every single one).
 */
export function splitFocusTieLabels(
    ties: CoauthorTie[],
    budget = FOCUS_LABEL_BUDGET,
): { labelled: CoauthorTie[]; unlabelled: CoauthorTie[] } {
    const strong = ties.filter((t) => t.shared >= 2);
    const weak = ties.filter((t) => t.shared < 2);
    const remaining = budget - 1 - strong.length; // -1 for the focus node's own label
    // Evenly-spaced picks across the weak ring (not a contiguous prefix) —
    // ring order is preserved (indices are strictly increasing), but a
    // prefix would bunch every labelled single-paper tie into one narrow
    // arc, right where the ring's own spacing math assumed they'd be spread
    // across the FULL circle, and they'd collide with each other again.
    const weakLabelled =
        remaining > 0 && weak.length > 0
            ? Array.from(
                  new Set(Array.from({ length: Math.min(remaining, weak.length) }, (_, k) => Math.floor((k * weak.length) / Math.min(remaining, weak.length)))),
              ).map((i) => weak[i])
            : [];
    const labelled = [...strong, ...weakLabelled];
    const labelledIds = new Set(labelled.map((t) => t.id));
    return { labelled, unlabelled: ties.filter((t) => !labelledIds.has(t.id)) };
}

export interface FocusLabelSelection {
    candidates: LabelCandidate[];
    /** Ties left unlabelled by the budget — still on the ring, revealed on hover/tap. */
    unlabelledTies: CoauthorTie[];
}

/**
 * Focus label candidates: the focus node and its strongest co-authors are
 * mandatory (see `splitFocusTieLabels` for the budget), plus a handful of
 * additional high-page-count people as optional context labels (capped by
 * `labelMode`).
 */
export function selectFocusLabelCandidates(
    people: LabelPerson[],
    focusId: string,
    ties: CoauthorTie[],
    labelMode: LabelMode,
    extraLimit = 8,
    budget = FOCUS_LABEL_BUDGET,
): FocusLabelSelection {
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
            fontSize: 14,
            mandatory: true,
        });
    }

    const { labelled, unlabelled } = splitFocusTieLabels(ties, budget);
    for (const tie of labelled) {
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

    return { candidates: out, unlabelledTies: unlabelled };
}

/**
 * Best-effort anchor for an on-demand single label — the hover/tap reveal
 * for a tie the label budget left unlabelled. Tries the same four anchors as
 * `layoutLabels` against the ALREADY-PLACED labels (so it won't cover one),
 * but — unlike a fresh `layoutLabels` candidate — always returns a position
 * (falling back to the first anchor) since the user explicitly asked to see
 * this one name.
 */
export function hoverLabelAnchor(
    node: { id: string; x: number; y: number; radius: number; name: string },
    existing: PlacedLabel[],
    contentPerScreenPx = 1,
    fontSize = 12.5,
): PlacedLabel {
    const px = (n: number) => n * contentPerScreenPx;
    const w = textWidth(node.name, px(fontSize));
    const h = px(fontSize);
    const gap = px(4);
    const anchors: { x: number; y: number }[] = [
        { x: node.x + node.radius + gap, y: node.y + h * 0.35 },
        { x: node.x - node.radius - gap - w, y: node.y + h * 0.35 },
        { x: node.x - w / 2, y: node.y + node.radius + h },
        { x: node.x - w / 2, y: node.y - node.radius - gap },
    ];
    const existingBoxes = existing.map((p) => {
        const epx = p.fontSize * contentPerScreenPx;
        return labelBox(p.x, p.y, textWidth(p.text, epx), epx);
    });

    for (const a of anchors) {
        const box = labelBox(a.x, a.y, w, h);
        if (!existingBoxes.some((q) => boxesOverlap(box, q))) {
            return { id: node.id, x: a.x, y: a.y, text: node.name, fontSize, mandatory: true };
        }
    }
    return { id: node.id, x: anchors[0].x, y: anchors[0].y, text: node.name, fontSize, mandatory: true };
}
