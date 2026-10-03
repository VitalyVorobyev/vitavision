import {
    createGrid,
    createLocalMeanSamples,
    createRingSamples,
} from "./patterns";
import type {
    ChessResponseComputation,
    ChessResponseControls,
    ChessResponseDiffTerm,
    ChessResponsePoint,
    ChessResponseSumTerm,
} from "./types";

function mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function oppositeSample(samples: ChessResponsePoint[], index: number): ChessResponsePoint {
    // Modulo keeps the index within [0, samples.length).
    return samples[(index + 8) % samples.length]!;
}

export function computeChessResponse(
    controls: ChessResponseControls,
): ChessResponseComputation {
    const grid = createGrid(controls);
    const samples = createRingSamples(controls);
    const localMeanSamples = createLocalMeanSamples(controls);

    // Term indices below are < CHESS_RESPONSE_SAMPLE_COUNT (16), the ring-sample count.
    const intensityAt = (index: number) => samples[index]!.intensity;

    const srTerms: ChessResponseSumTerm[] = Array.from({ length: 4 }, (_, phase) => {
        const pairA: [number, number] = [phase, phase + 8];
        const pairB: [number, number] = [phase + 4, phase + 12];
        const sumA = intensityAt(pairA[0]) + intensityAt(pairA[1]);
        const sumB = intensityAt(pairB[0]) + intensityAt(pairB[1]);

        return {
            phase,
            pairA,
            pairB,
            sumA,
            sumB,
            value: Math.abs(sumA - sumB),
        };
    });

    const drTerms: ChessResponseDiffTerm[] = Array.from({ length: 8 }, (_, index) => {
        const opposite = oppositeSample(samples, index);
        return {
            index,
            pair: [index, opposite.index],
            value: Math.abs(intensityAt(index) - opposite.intensity),
        };
    });

    const localMean = mean(localMeanSamples.map((sample) => sample.intensity));
    const neighborMean = mean(samples.map((sample) => sample.intensity));
    const sr = srTerms.reduce((sum, term) => sum + term.value, 0);
    const dr = drTerms.reduce((sum, term) => sum + term.value, 0);
    const mr = Math.abs(neighborMean - localMean);
    const response = sr - dr - 16 * mr;

    return {
        grid,
        samples,
        localMeanSamples,
        srTerms,
        drTerms,
        localMean,
        neighborMean,
        sr,
        dr,
        mr,
        response,
    };
}

export function describePatternResponse(
    controls: ChessResponseControls,
): string {
    switch (controls.pattern) {
        case "corner":
            return "Corner samples form the expected two-cycle structure, so SR stays dominant while DR and MR remain comparatively small.";
        case "edge":
            return "A simple edge drives large opposite-side differences across the ring, so DR subtracts away most of the corner evidence.";
        case "stripe":
            return "The ring alone still looks corner-like, but the bright center patch shifts the local mean and MR suppresses the false positive.";
    }
}

export function responseStatus(value: number): {
    label: string;
    className: string;
} {
    if (value > 150) {
        return {
            label: "strong corner response",
            className: "border-normal/30 bg-normal/10 text-normal",
        };
    }
    if (value > 0) {
        return {
            label: "weak positive response",
            className: "border-signal/30 bg-signal/10 text-signal",
        };
    }
    return {
        label: "suppressed response",
        className: "border-warn/30 bg-warn/10 text-warn",
    };
}
