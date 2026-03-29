import {
    CHESS_RESPONSE_GRID_SIZE,
    CHESS_RESPONSE_LOCAL_MEAN_OFFSETS,
    CHESS_RESPONSE_RING_RADIUS,
    CHESS_RESPONSE_SAMPLE_COUNT,
    type ChessResponseControls,
    type ChessResponseGridCell,
    type ChessResponseLocalMeanSample,
    type ChessResponsePoint,
} from "./types";

const STRIPE_HALF_WIDTH = 3.2;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function rotatePoint(x: number, y: number, rotationDeg: number): { x: number; y: number } {
    const angle = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: cos * x + sin * y,
        y: -sin * x + cos * y,
    };
}

function softnessFromBlur(blur: number): number {
    return 0.12 + blur * 1.45;
}

function applyContrast(unitValue: number, contrast: number): number {
    return clamp(0.5 + (unitValue - 0.5) * contrast, 0, 1);
}

export function sampleIntensityAt(
    x: number,
    y: number,
    controls: ChessResponseControls,
): number {
    const rotated = rotatePoint(x, y, controls.rotationDeg);
    const softness = softnessFromBlur(controls.blur);

    let unitValue = 0.5;
    switch (controls.pattern) {
        case "corner":
            unitValue =
                0.5 +
                0.5 * Math.tanh(rotated.x / softness) * Math.tanh(rotated.y / softness);
            break;
        case "edge":
            unitValue = 0.5 + 0.5 * Math.tanh(rotated.x / softness);
            break;
        case "stripe":
            unitValue =
                0.5 +
                0.5 * Math.tanh((STRIPE_HALF_WIDTH - Math.abs(rotated.x)) / softness);
            break;
    }

    return applyContrast(unitValue, controls.contrast) * 255;
}

export function createGrid(controls: ChessResponseControls): ChessResponseGridCell[] {
    const center = (CHESS_RESPONSE_GRID_SIZE - 1) / 2;
    const grid: ChessResponseGridCell[] = [];

    for (let row = 0; row < CHESS_RESPONSE_GRID_SIZE; row += 1) {
        for (let col = 0; col < CHESS_RESPONSE_GRID_SIZE; col += 1) {
            const x = col - center;
            const y = row - center;
            grid.push({
                row,
                col,
                x,
                y,
                intensity: sampleIntensityAt(x, y, controls),
            });
        }
    }

    return grid;
}

export function createRingSamples(controls: ChessResponseControls): ChessResponsePoint[] {
    const samples: ChessResponsePoint[] = [];

    for (let index = 0; index < CHESS_RESPONSE_SAMPLE_COUNT; index += 1) {
        const angleRad = (-Math.PI / 2) + (index * 2 * Math.PI) / CHESS_RESPONSE_SAMPLE_COUNT;
        const x = Math.cos(angleRad) * CHESS_RESPONSE_RING_RADIUS;
        const y = Math.sin(angleRad) * CHESS_RESPONSE_RING_RADIUS;
        samples.push({
            index,
            label: `I${index}`,
            angleRad,
            x,
            y,
            intensity: sampleIntensityAt(x, y, controls),
        });
    }

    return samples;
}

export function createLocalMeanSamples(
    controls: ChessResponseControls,
): ChessResponseLocalMeanSample[] {
    return CHESS_RESPONSE_LOCAL_MEAN_OFFSETS.map(({ x, y }, index) => ({
        id: `M${index}`,
        x,
        y,
        intensity: sampleIntensityAt(x, y, controls),
    }));
}

