import { CHESS_RESPONSE_GRID_SIZE, CHESS_RESPONSE_RING_RADIUS } from "./types";
import type { ChessResponseComputation } from "./types";

const PHASE_COLORS = ["#0f766e", "#2563eb", "#9333ea", "#c2410c"];
const DR_COLOR = "#b91c1c";
const MR_COLOR = "#d97706";
const VIEW_BOX_SIZE = 540;
const GRID_ORIGIN = 83;
const CELL_SIZE = 22;
const GRID_CENTER = GRID_ORIGIN + (CHESS_RESPONSE_GRID_SIZE * CELL_SIZE) / 2;
const RING_RADIUS_SVG = CHESS_RESPONSE_RING_RADIUS * CELL_SIZE;

export interface ChessResponseSvgPalette {
    surface: string;
    background: string;
    border: string;
    foreground: string;
    muted: string;
    pixelStroke: string;
}

export interface ChessResponseSvgFonts {
    sans: string;
    mono: string;
}

const DEFAULT_PALETTE: ChessResponseSvgPalette = {
    surface: "hsl(var(--surface))",
    background: "hsl(var(--background))",
    border: "hsl(var(--border))",
    foreground: "hsl(var(--foreground))",
    muted: "hsl(var(--muted-foreground))",
    pixelStroke: "rgb(148 163 184 / 0.22)",
};

const DEFAULT_FONTS: ChessResponseSvgFonts = {
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
};

interface ChessResponseSvgProps {
    patternLabel: string;
    rotationDeg: number;
    computation: ChessResponseComputation;
    showSampleLabels: boolean;
    showSrPairs: boolean;
    showDrPairs: boolean;
    showMrRegions: boolean;
    variantLabel?: string;
    palette?: ChessResponseSvgPalette;
    fonts?: ChessResponseSvgFonts;
    svgClassName?: string;
    width?: number | string;
    height?: number | string;
}

function toSvg(x: number, y: number): { x: number; y: number } {
    return {
        x: GRID_CENTER + x * CELL_SIZE,
        y: GRID_CENTER + y * CELL_SIZE,
    };
}

function grayscale(intensity: number): string {
    const shade = Math.round(Math.max(0, Math.min(255, intensity)));
    return `rgb(${shade} ${shade} ${shade})`;
}

export default function ChessResponseSvg({
    patternLabel,
    rotationDeg,
    computation,
    showSampleLabels,
    showSrPairs,
    showDrPairs,
    showMrRegions,
    palette = DEFAULT_PALETTE,
    fonts = DEFAULT_FONTS,
    svgClassName = "h-auto w-full text-foreground",
    width,
    height,
}: ChessResponseSvgProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
            className={svgClassName}
            style={{ color: palette.foreground }}
            width={width}
            height={height}
            role="img"
            aria-label={`ChESS detector response illustration for the ${patternLabel} case at ${rotationDeg.toFixed(1)} degrees.`}
        >
            <rect
                x="1"
                y="1"
                width={VIEW_BOX_SIZE - 2}
                height={VIEW_BOX_SIZE - 2}
                rx="28"
                fill={palette.surface}
                stroke={palette.border}
            />

            <g aria-hidden="true">
                {computation.grid.map((cell) => (
                    <rect
                        key={`${cell.row}-${cell.col}`}
                        x={GRID_ORIGIN + cell.col * CELL_SIZE}
                        y={GRID_ORIGIN + cell.row * CELL_SIZE}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        fill={grayscale(cell.intensity)}
                        stroke={palette.pixelStroke}
                        strokeWidth="1"
                    />
                ))}
            </g>

            {showMrRegions && (
                <g aria-hidden="true">
                    {computation.localMeanSamples.map((sample) => {
                        const position = toSvg(sample.x, sample.y);
                        return (
                            <rect
                                key={sample.id}
                                x={position.x - CELL_SIZE / 2}
                                y={position.y - CELL_SIZE / 2}
                                width={CELL_SIZE}
                                height={CELL_SIZE}
                                fill="none"
                                stroke={MR_COLOR}
                                strokeWidth="2.5"
                                rx="4"
                            />
                        );
                    })}
                    {/* <text
                        x={GRID_ORIGIN - 12}
                        y={GRID_CENTER + 6}
                        textAnchor="end"
                        fontSize="12"
                        fontFamily={fonts.mono}
                        fill={MR_COLOR}
                    >
                        local mean
                    </text> */}
                </g>
            )}

            <circle
                cx={GRID_CENTER}
                cy={GRID_CENTER}
                r={RING_RADIUS_SVG}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.45"
                strokeDasharray="5 7"
                aria-hidden="true"
            />

            {showSrPairs && (
                <g aria-hidden="true">
                    {computation.srTerms.map((term) => {
                        const a0 = toSvg(
                            computation.samples[term.pairA[0]].x,
                            computation.samples[term.pairA[0]].y,
                        );
                        const a1 = toSvg(
                            computation.samples[term.pairA[1]].x,
                            computation.samples[term.pairA[1]].y,
                        );
                        const b0 = toSvg(
                            computation.samples[term.pairB[0]].x,
                            computation.samples[term.pairB[0]].y,
                        );
                        const b1 = toSvg(
                            computation.samples[term.pairB[1]].x,
                            computation.samples[term.pairB[1]].y,
                        );
                        const color = PHASE_COLORS[term.phase];

                        return (
                            <g key={`sr-${term.phase}`}>
                                <line
                                    x1={a0.x}
                                    y1={a0.y}
                                    x2={a1.x}
                                    y2={a1.y}
                                    stroke={color}
                                    strokeOpacity="0.45"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1={b0.x}
                                    y1={b0.y}
                                    x2={b1.x}
                                    y2={b1.y}
                                    stroke={color}
                                    strokeOpacity="0.25"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                />
                            </g>
                        );
                    })}
                </g>
            )}

            {showDrPairs && (
                <g aria-hidden="true">
                    {computation.drTerms.map((term) => {
                        const from = toSvg(
                            computation.samples[term.pair[0]].x,
                            computation.samples[term.pair[0]].y,
                        );
                        const to = toSvg(
                            computation.samples[term.pair[1]].x,
                            computation.samples[term.pair[1]].y,
                        );

                        return (
                            <line
                                key={`dr-${term.index}`}
                                x1={from.x}
                                y1={from.y}
                                x2={to.x}
                                y2={to.y}
                                stroke={DR_COLOR}
                                strokeOpacity="0.55"
                                strokeWidth="1.8"
                                strokeDasharray="4 6"
                                strokeLinecap="round"
                            />
                        );
                    })}
                </g>
            )}

            <g aria-hidden="true">
                {computation.samples.map((sample) => {
                    const position = toSvg(sample.x, sample.y);
                    return (
                        <g key={sample.index}>
                            <circle
                                cx={position.x}
                                cy={position.y}
                                r="9"
                                fill={grayscale(sample.intensity)}
                                stroke={palette.surface}
                                strokeWidth="2.5"
                            />
                            <circle
                                cx={position.x}
                                cy={position.y}
                                r="10.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeOpacity="0.45"
                            />
                            {showSampleLabels && (
                                <text
                                    x={GRID_CENTER + Math.cos(sample.angleRad) * (RING_RADIUS_SVG + 28)}
                                    y={GRID_CENTER + Math.sin(sample.angleRad) * (RING_RADIUS_SVG + 28) + 4}
                                    fontSize="11"
                                    fontFamily={fonts.mono}
                                    textAnchor="middle"
                                    fill="currentColor"
                                >
                                    {sample.label}
                                </text>
                            )}
                        </g>
                    );
                })}
            </g>

            <circle
                cx={GRID_CENTER}
                cy={GRID_CENTER}
                r="5"
                fill={palette.background}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.75"
                aria-hidden="true"
            />

            {/* <g aria-hidden="true">
                <rect
                    x="22"
                    y="22"
                    width="170"
                    height="56"
                    rx="14"
                    fill={palette.background}
                    fillOpacity="0.92"
                    stroke={palette.border}
                />
                <text
                    x="38"
                    y="46"
                    fontSize="11"
                    fontFamily={fonts.mono}
                    fill={palette.muted}
                >
                    {variantLabel ?? "pattern"}
                </text>
                <text
                    x="38"
                    y="67"
                    fontSize="16"
                    fontFamily={fonts.sans}
                    fill="currentColor"
                    fontWeight="600"
                >
                    {patternLabel}
                </text>
                <text
                    x={VIEW_BOX_SIZE - 22}
                    y="46"
                    textAnchor="end"
                    fontSize="11"
                    fontFamily={fonts.mono}
                    fill={palette.muted}
                >
                    rotation
                </text>
                <text
                    x={VIEW_BOX_SIZE - 22}
                    y="67"
                    textAnchor="end"
                    fontSize="16"
                    fontFamily={fonts.sans}
                    fill="currentColor"
                    fontWeight="600"
                >
                    {rotationDeg.toFixed(1)}°
                </text>
            </g> */}
        </svg>
    );
}
