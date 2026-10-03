// Domain types for the editor store. Kept free of any import from
// useEditorStore.ts (or anything that imports it) to avoid import cycles —
// this module is the leaf that everything else in the store depends on.

export type ToolType = 'SELECT' | 'POINT' | 'LINE' | 'POLYLINE' | 'POLYGON' | 'BBOX' | 'ELLIPSE';
export type FeatureType = 'point' | 'line' | 'polyline' | 'polygon' | 'bbox' | 'ellipse' | 'directed_point' | 'ring_marker' | 'aruco_marker' | 'circle' | 'labeled_point';
export type FeatureSource = 'manual' | 'algorithm';
export type SampleId = 'chessboard' | 'charuco' | 'markerboard' | 'ringgrid' | 'puzzleboard' | 'upload';

export interface Point2D {
    x: number;
    y: number;
}

export interface GridCoords {
    i: number;
    j: number;
}

export interface GridCell {
    gx: number;
    gy: number;
}

export interface CellOffset {
    di: number;
    dj: number;
}

export interface FeatureMeta {
    kind?: string | undefined;
    score?: number | undefined;
    grid?: GridCoords | undefined;
    gridCell?: GridCell | undefined;
    cornerId?: number | null | undefined;
    markerId?: number | null | undefined;
    targetPosition?: Point2D | null | undefined;
    rotation?: number | undefined;
    hamming?: number | undefined;
    borderScore?: number | undefined;
    code?: number | undefined;
    inverted?: boolean | undefined;
    polarity?: string | undefined;
    contrast?: number | undefined;
    offsetCells?: CellOffset | null | undefined;
}

export interface BaseFeature {
    id: string;
    type: FeatureType;
    source: FeatureSource;
    algorithmId?: string | undefined;
    runId?: string | undefined;
    readonly?: boolean | undefined;
    color?: string | undefined;
    label?: string | undefined;
    meta?: FeatureMeta | undefined;
}

export interface PointFeature extends BaseFeature {
    type: 'point';
    x: number;
    y: number;
    angle?: number | undefined;
}

export interface LineFeature extends BaseFeature {
    type: 'line';
    points: [number, number, number, number];
}

export interface PolylineFeature extends BaseFeature {
    type: 'polyline';
    points: number[];
}

export interface PolygonFeature extends BaseFeature {
    type: 'polygon';
    points: number[];
    closed: boolean;
}

export interface BBoxFeature extends BaseFeature {
    type: 'bbox';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

export interface EllipseFeature extends BaseFeature {
    type: 'ellipse';
    x: number;
    y: number;
    radiusX: number;
    radiusY: number;
    rotation: number;
}

export interface DirectedAxis {
    dx: number;
    dy: number;
    sigmaRad?: number | undefined;
    angleRad?: number | undefined;
}

export interface DirectedPointFeature extends BaseFeature {
    type: 'directed_point';
    x: number;
    y: number;
    axes: [DirectedAxis, DirectedAxis];
    score: number;
    contrast?: number | undefined;
    fitRms?: number | undefined;
}

export interface RingMarkerEllipse {
    cx: number;
    cy: number;
    a: number;
    b: number;
    angleDeg: number;
}

export interface RingMarkerFeature extends BaseFeature {
    type: 'ring_marker';
    x: number;
    y: number;
    outerEllipse: RingMarkerEllipse;
    innerEllipse: RingMarkerEllipse;
}

export interface ArUcoMarkerFeature extends BaseFeature {
    type: 'aruco_marker';
    x: number;
    y: number;
    corners: [number, number, number, number, number, number, number, number];
}

export interface CircleFeature extends BaseFeature {
    type: 'circle';
    x: number;
    y: number;
    radius: number;
    score?: number | undefined;
}

export interface LabeledPointFeature extends BaseFeature {
    type: 'labeled_point';
    x: number;
    y: number;
    score: number;
    gridIndex: { i: number; j: number };
    masterId: number;
    targetPosMm?: { x: number; y: number } | undefined;
}

export type Feature =
    | PointFeature
    | LineFeature
    | PolylineFeature
    | PolygonFeature
    | BBoxFeature
    | EllipseFeature
    | DirectedPointFeature
    | RingMarkerFeature
    | ArUcoMarkerFeature
    | CircleFeature
    | LabeledPointFeature;

export interface GalleryImage {
    id: string;
    src: string;
    name: string;
    sampleId: SampleId;
    description?: string;
    recommendedAlgorithms?: string[];
}

// --- Panel mode, run history, overlay visibility ---

export type PanelMode = 'configure' | 'results';

export type OverlayVisibilityKey = 'features' | 'algorithmOverlay';

export interface OverlayToggles {
    edges: boolean;
    labels: boolean;
}

export interface RunSummaryEntry {
    label: string;
    value: string;
}

export interface RunHistoryEntry {
    runId: string;
    algorithmId: string;
    algorithmTitle: string;
    summary: RunSummaryEntry[];
    featureCount: number;
    timestamp: number;
}
