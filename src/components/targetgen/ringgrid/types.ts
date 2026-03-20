export interface RingGridCodebook {
    bits: number;
    minCyclicDist: number;
    codes: number[];
}

export interface RingGridMarker {
    id: number;
    x: number;
    y: number;
    q?: number;
    r?: number;
}
