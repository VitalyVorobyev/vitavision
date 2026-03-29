import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ChessResponseSvg, {
    type ChessResponseSvgFonts,
    type ChessResponseSvgPalette,
} from "../src/components/illustrations/chess-response/ChessResponseSvg.tsx";
import { computeChessResponse } from "../src/components/illustrations/chess-response/math.ts";
import type { ChessResponsePattern } from "../src/components/illustrations/chess-response/types";

const OUTPUT_DIR = join(import.meta.dir, "..", "content", "images", "01-chess");
const ROTATION_DEG = 22.5;
const DEFAULT_BLUR = 0.9;
const DEFAULT_CONTRAST = 1.08;

const PATTERNS: ChessResponsePattern[] = ["corner", "edge", "stripe"];
const TERM_CONFIGS = [
    {
        key: "sr",
        label: "SR overlay",
        showSrPairs: true,
        showDrPairs: false,
        showMrRegions: false,
    },
    {
        key: "dr",
        label: "DR overlay",
        showSrPairs: false,
        showDrPairs: true,
        showMrRegions: false,
    },
    {
        key: "mr",
        label: "MR overlay",
        showSrPairs: false,
        showDrPairs: false,
        showMrRegions: true,
    },
] as const;

const STATIC_PALETTE: ChessResponseSvgPalette = {
    surface: "#f8fafc",
    background: "#ffffff",
    border: "#cbd5e1",
    foreground: "#1e293b",
    muted: "#64748b",
    pixelStroke: "rgba(148, 163, 184, 0.22)",
};

const STATIC_FONTS: ChessResponseSvgFonts = {
    sans: "Inter, system-ui, sans-serif",
    mono: "Geist Mono, SFMono-Regular, Menlo, Consolas, monospace",
};

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function createSvg(pattern: ChessResponsePattern, term: typeof TERM_CONFIGS[number]): string {
    const computation = computeChessResponse({
        pattern,
        rotationDeg: ROTATION_DEG,
        blur: DEFAULT_BLUR,
        contrast: DEFAULT_CONTRAST,
    });

    const svg = renderToStaticMarkup(
        <ChessResponseSvg
            patternLabel={capitalize(pattern)}
            rotationDeg={ROTATION_DEG}
            computation={computation}
            showSampleLabels
            showSrPairs={term.showSrPairs}
            showDrPairs={term.showDrPairs}
            showMrRegions={term.showMrRegions}
            variantLabel={term.label}
            palette={STATIC_PALETTE}
            fonts={STATIC_FONTS}
            svgClassName={undefined}
            width={540}
            height={540}
        />,
    );

    return `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`;
}

function main(): void {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const pattern of PATTERNS) {
        for (const term of TERM_CONFIGS) {
            const filename = `chess-response-${pattern}-${term.key}.svg`;
            const target = join(OUTPUT_DIR, filename);
            writeFileSync(target, createSvg(pattern, term), "utf-8");
            console.log(`wrote ${target}`);
        }
    }
}

main();
