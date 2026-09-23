// Shared render-ready types passed between the People-network canvas pieces.
// Positions are pre-resolved by the container (focus-ring overrides merged
// with each node's real network coordinate) so every child component reads
// a plain, stable Map instead of recomputing a fallback per node.

export interface NetworkPoint {
    x: number;
    y: number;
}

export interface NetworkPerson {
    id: string;
    name: string;
    pageCount: number;
    group: string;
    firstYear: number;
    lastYear: number;
}
