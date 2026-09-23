/**
 * Pure layout for the paper page's "Lineage" dot-histogram strip.
 *
 * One dot per registry paper the subject paper cites (`cites`, plotted below
 * the year axis, hollow) or is cited by (`citedBy`, plotted above the axis,
 * filled) — grouped by year, stacked outward from the axis so simultaneous
 * publications don't overlap. The axis spans every year involved, including
 * the paper's own year even when neither list touches it. Pixel constants are
 * chosen to look right against the ~700px reading-column width the desktop
 * card renders at; `LineageStrip` scales the whole SVG down for narrower
 * viewports via `viewBox`, so this stays resolution-independent.
 */

export interface LineagePoint {
    id: string;
    year: number;
    x: number;
    y: number;
    /** 0-based position within its year's stack, nearest-to-axis first. */
    stackIndex: number;
}

export interface LineageTick {
    year: number;
    x: number;
    isPaperYear: boolean;
}

export interface LineageLayout {
    width: number;
    height: number;
    axisY: number;
    axisX1: number;
    axisX2: number;
    /** X position of the paper's own year on the axis. */
    paperX: number;
    minYear: number;
    maxYear: number;
    ticks: LineageTick[];
    /** Stacked above the axis (built-upon-by), nearest-to-axis first. */
    citedBy: LineagePoint[];
    /** Stacked below the axis (builds-on), nearest-to-axis first. */
    cites: LineagePoint[];
}

const MARGIN_X = 28;
/** Distance from the axis center to the nearest dot's center. */
const DOT_GAP = 21;
/** Additional distance per further dot in the same year's stack. */
const DOT_STEP = 13;
/** Headroom above the topmost possible dot. */
const TOP_PAD = 12;
/** Room below the axis reserved for the tick line + year labels. */
const AXIS_LABEL_PAD = 34;
/** Minimum half-height on each side even when a side has no dots at all,
 *  so the strip still reads as a two-band chart. */
const MIN_BAND = 40;

interface LineageInput {
    id: string;
    year: number;
}

function halfSpan(maxCount: number): number {
    return maxCount === 0 ? MIN_BAND : Math.max(MIN_BAND, DOT_GAP + (maxCount - 1) * DOT_STEP);
}

/** Groups `items` by year and assigns each a 0-based stack index within its
 *  year, preserving input order. Returns the points (without `y`, which
 *  depends on the axis position computed by the caller) and the deepest
 *  per-year stack count. */
function stackByYear(
    items: readonly LineageInput[],
    xOfYear: (year: number) => number,
): { points: Omit<LineagePoint, "y">[]; maxCount: number } {
    const counters = new Map<number, number>();
    const points = items.map((item) => {
        const stackIndex = counters.get(item.year) ?? 0;
        counters.set(item.year, stackIndex + 1);
        return { id: item.id, year: item.year, x: xOfYear(item.year), stackIndex };
    });
    const maxCount = counters.size === 0 ? 0 : Math.max(...counters.values());
    return { points, maxCount };
}

export function computeLineageLayout(params: {
    paperYear: number;
    cites: readonly LineageInput[];
    citedBy: readonly LineageInput[];
    width: number;
}): LineageLayout {
    const { paperYear, cites, citedBy, width } = params;

    const years = [paperYear, ...cites.map((c) => c.year), ...citedBy.map((c) => c.year)];
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const span = maxYear - minYear;

    const axisX1 = MARGIN_X;
    const axisX2 = Math.max(axisX1, width - MARGIN_X);
    const xOfYear = (year: number): number =>
        span === 0 ? (axisX1 + axisX2) / 2 : axisX1 + ((year - minYear) / span) * (axisX2 - axisX1);

    const ticks: LineageTick[] = [];
    for (let y = minYear; y <= maxYear; y++) {
        ticks.push({ year: y, x: xOfYear(y), isPaperYear: y === paperYear });
    }

    const above = stackByYear(citedBy, xOfYear);
    const below = stackByYear(cites, xOfYear);

    const axisY = TOP_PAD + halfSpan(above.maxCount);
    const height = axisY + halfSpan(below.maxCount) + AXIS_LABEL_PAD;

    const citedByPoints: LineagePoint[] = above.points.map((p) => ({
        ...p,
        y: axisY - (DOT_GAP + p.stackIndex * DOT_STEP),
    }));
    const citesPoints: LineagePoint[] = below.points.map((p) => ({
        ...p,
        y: axisY + (DOT_GAP + p.stackIndex * DOT_STEP),
    }));

    return {
        width,
        height,
        axisY,
        axisX1,
        axisX2,
        paperX: xOfYear(paperYear),
        minYear,
        maxYear,
        ticks,
        citedBy: citedByPoints,
        cites: citesPoints,
    };
}
