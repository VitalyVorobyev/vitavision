// EdgeMarkers — SVG <defs> arrowhead markers for a set of edge/relation
// colors, one <marker> per entry, id'd `${idPrefix}${key}`. Shared by
// GraphExplorer's EdgesLayer and NarrativeCanvas.

export interface EdgeMarkerSpec {
    key:   string;
    color: string;
}

export interface EdgeMarkersProps {
    idPrefix: string;
    markers:  EdgeMarkerSpec[];
}

export function EdgeMarkers({ idPrefix, markers }: EdgeMarkersProps) {
    return (
        <defs>
            {markers.map((m) => (
                <marker
                    key={`mk-${m.key}`}
                    id={`${idPrefix}${m.key}`}
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                >
                    <path d="M0,1 L9,5 L0,9 Z" fill={m.color} />
                </marker>
            ))}
        </defs>
    );
}
