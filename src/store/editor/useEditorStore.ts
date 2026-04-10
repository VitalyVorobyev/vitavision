import { create } from 'zustand';
import { featureSchema } from './featureSchema';

export type ToolType = 'SELECT' | 'POINT' | 'LINE' | 'POLYLINE' | 'POLYGON' | 'BBOX' | 'ELLIPSE';
export type FeatureType = 'point' | 'line' | 'polyline' | 'polygon' | 'bbox' | 'ellipse' | 'directed_point' | 'ring_marker' | 'aruco_marker' | 'circle';
export type FeatureSource = 'manual' | 'algorithm';
export type SampleId = 'chessboard' | 'charuco' | 'markerboard' | 'ringgrid' | 'upload';

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
    kind?: string;
    score?: number;
    grid?: GridCoords;
    gridCell?: GridCell;
    cornerId?: number | null;
    markerId?: number | null;
    targetPosition?: Point2D | null;
    rotation?: number;
    hamming?: number;
    borderScore?: number;
    code?: number;
    inverted?: boolean;
    polarity?: string;
    contrast?: number;
    distanceCells?: number | null;
    offsetCells?: CellOffset | null;
}

export interface BaseFeature {
    id: string;
    type: FeatureType;
    source: FeatureSource;
    algorithmId?: string;
    runId?: string;
    readonly?: boolean;
    color?: string;
    label?: string;
    meta?: FeatureMeta;
}

export interface PointFeature extends BaseFeature {
    type: 'point';
    x: number;
    y: number;
    angle?: number;
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

export interface DirectedPointFeature extends BaseFeature {
    type: 'directed_point';
    x: number;
    y: number;
    direction: {
        dx: number;
        dy: number;
    };
    score: number;
    orientationRad?: number;
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
    score?: number;
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
    | CircleFeature;

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

const DEFAULT_OVERLAY_TOGGLES: OverlayToggles = {
    edges: true,
    labels: false,
};

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

const MAX_RUN_HISTORY = 20;

export const normalizeFeature = (feature: Feature): Feature => {
    const source: FeatureSource = feature.source === 'algorithm' ? 'algorithm' : 'manual';
    const readonly = feature.readonly ?? source === 'algorithm';
    return {
        ...feature,
        source,
        readonly,
    };
};

export const normalizeImportedFeatures = (value: unknown): Feature[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => featureSchema.safeParse(item))
        .filter((result): result is { success: true; data: Feature } => result.success)
        .map((result) => normalizeFeature(result.data as Feature));
};

export const isReadonlyFeature = (feature: Feature): boolean => {
    return feature.readonly === true;
};

interface EditorState {
    imageSrc: string | null;
    imageName: string | null;
    imageSampleId: SampleId;
    imageWidth: number;
    imageHeight: number;

    activeTool: ToolType;
    toolVersion: number;
    selectedFeatureId: string | null;
    features: Feature[];

    zoom: number;
    pan: { x: number; y: number };
    showFeatures: boolean;

    galleryMode: boolean;
    galleryImages: GalleryImage[];

    panelMode: PanelMode;
    selectedAlgorithmId: string;
    lastAlgorithmResult: { algorithmId: string; result: unknown } | null;
    runHistory: RunHistoryEntry[];
    overlayVisibility: Record<OverlayVisibilityKey, boolean>;
    featureGroupVisibility: Record<string, boolean>;
    overlayToggles: OverlayToggles;

    heatmapData: { rgba: Uint8Array; width: number; height: number } | null;
    heatmapVisible: boolean;
    heatmapOpacity: number;
    heatmapColormap: "magma" | "jet" | "hot";

    setImage: (src: string, width: number, height: number, name?: string, sampleId?: SampleId) => void;
    setActiveTool: (tool: ToolType) => void;
    setSelectedFeatureId: (id: string | null) => void;

    addFeature: (f: Feature) => void;
    updateFeature: (id: string, partial: Partial<Feature>) => void;
    deleteFeature: (id: string) => void;
    setFeatures: (features: Feature[]) => void;
    replaceAlgorithmFeatures: (algorithmId: string, features: Feature[]) => void;

    setZoom: (zoom: number) => void;
    setPan: (pan: { x: number; y: number }) => void;
    setShowFeatures: (show: boolean) => void;

    setGalleryMode: (mode: boolean) => void;
    addGalleryImage: (img: GalleryImage) => void;

    setPanelMode: (mode: PanelMode) => void;
    setSelectedAlgorithmId: (id: string) => void;
    setLastAlgorithmResult: (algorithmId: string, result: unknown) => void;
    addRunToHistory: (entry: RunHistoryEntry) => void;
    clearRunHistory: () => void;
    clearFeatures: () => void;
    setFeatureGroupVisibility: (key: string, visible: boolean) => void;
    resetFeatureGroupVisibility: () => void;
    setOverlayVisibility: (key: OverlayVisibilityKey, visible: boolean) => void;
    setOverlayToggle: (key: keyof OverlayToggles, value: boolean) => void;

    setHeatmapData: (data: { rgba: Uint8Array; width: number; height: number } | null) => void;
    setHeatmapVisible: (visible: boolean) => void;
    setHeatmapOpacity: (opacity: number) => void;
    setHeatmapColormap: (colormap: "magma" | "jet" | "hot") => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    imageSrc: null,
    imageName: null,
    imageSampleId: 'upload',
    imageWidth: 0,
    imageHeight: 0,

    activeTool: 'SELECT',
    toolVersion: 0,
    selectedFeatureId: null,
    features: [],

    zoom: 1,
    pan: { x: 0, y: 0 },

    setImage: (src, width, height, name, sampleId) => set({
        imageSrc: src,
        imageName: name ?? null,
        imageSampleId: sampleId ?? 'upload',
        imageWidth: width,
        imageHeight: height,
        features: [],
        selectedFeatureId: null,
        showFeatures: true,
        lastAlgorithmResult: null,
        runHistory: [],
        overlayVisibility: { features: true, algorithmOverlay: true },
        featureGroupVisibility: {},
        overlayToggles: DEFAULT_OVERLAY_TOGGLES,
        panelMode: 'configure',
        heatmapData: null,
        heatmapVisible: true,
        heatmapOpacity: 0.5,
        heatmapColormap: 'magma',
    }),
    setActiveTool: (tool) => set((state) => ({
        activeTool: tool,
        toolVersion: state.toolVersion + 1,
        selectedFeatureId: null,
    })),
    setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),

    addFeature: (f) => set((state) => ({ features: [...state.features, normalizeFeature(f)] })),

    updateFeature: (id, partial) => set((state) => ({
        features: state.features.map((feature) => {
            if (feature.id !== id || isReadonlyFeature(feature)) {
                return feature;
            }
            return normalizeFeature({ ...feature, ...partial } as Feature);
        }),
    })),

    deleteFeature: (id) => set((state) => {
        const feature = state.features.find((candidate) => candidate.id === id);
        if (!feature || isReadonlyFeature(feature)) {
            return state;
        }
        return {
            features: state.features.filter((candidate) => candidate.id !== id),
            selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId,
        };
    }),

    setFeatures: (features) => set({ features: features.map(normalizeFeature) }),

    replaceAlgorithmFeatures: (algorithmId, features) => set((state) => {
        const retained = state.features.filter((feature) => !(
            feature.source === 'algorithm' && feature.algorithmId === algorithmId
        ));
        const incoming = features.map((feature) => normalizeFeature({
            ...feature,
            source: 'algorithm',
            algorithmId,
            readonly: true,
        }));
        const selectedStillExists = state.selectedFeatureId !== null && (
            retained.some((feature) => feature.id === state.selectedFeatureId)
            || incoming.some((feature) => feature.id === state.selectedFeatureId)
        );
        return {
            features: [...retained, ...incoming],
            selectedFeatureId: selectedStillExists ? state.selectedFeatureId : null,
        };
    }),

    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),

    showFeatures: true,
    setShowFeatures: (show) => set((state) => ({
        showFeatures: show,
        overlayVisibility: { ...state.overlayVisibility, features: show },
    })),

    galleryMode: true,
    galleryImages: [
        {
            id: 'sample-chessboard',
            src: '/chessboard.png',
            name: 'Chessboard',
            sampleId: 'chessboard',
            description: 'Labeled board corners or low-level ChESS keypoints on the same sample.',
            recommendedAlgorithms: ['Chessboard', 'ChESS Corners'],
        },
        {
            id: 'sample-charuco',
            src: '/charuco.png',
            name: 'ChArUco',
            sampleId: 'charuco',
            description: 'Dense ChArUco board with embedded markers.',
            recommendedAlgorithms: ['ChArUco'],
        },
        {
            id: 'sample-markerboard',
            src: '/markerboard.png',
            name: 'Marker Board',
            sampleId: 'markerboard',
            description: 'Checkerboard plus fiducial circles for marker-board detection.',
            recommendedAlgorithms: ['Marker Board'],
        },
        {
            id: 'sample-ringgrid',
            src: '/ringgrid.png',
            name: 'Ring Grid',
            sampleId: 'ringgrid',
            description: 'Hex-lattice concentric ring markers with binary code bands.',
            recommendedAlgorithms: ['Ring Grid', 'Radial Symmetry'],
        },
    ],
    setGalleryMode: (mode) => set({ galleryMode: mode }),
    addGalleryImage: (img) => set((state) => ({ galleryImages: [...state.galleryImages, img] })),

    panelMode: 'configure',
    selectedAlgorithmId: 'chess-corners',
    lastAlgorithmResult: null,
    runHistory: [],
    overlayVisibility: { features: true, algorithmOverlay: true },
    featureGroupVisibility: {},
    overlayToggles: DEFAULT_OVERLAY_TOGGLES,

    setPanelMode: (mode) => set({ panelMode: mode }),
    setSelectedAlgorithmId: (id) => set({ selectedAlgorithmId: id }),
    setLastAlgorithmResult: (algorithmId, result) => set({
        lastAlgorithmResult: { algorithmId, result },
    }),
    addRunToHistory: (entry) => set((state) => ({
        runHistory: [entry, ...state.runHistory].slice(0, MAX_RUN_HISTORY),
    })),
    clearRunHistory: () => set({ runHistory: [] }),
    clearFeatures: () => set({
        features: [],
        selectedFeatureId: null,
        showFeatures: true,
        lastAlgorithmResult: null,
        runHistory: [],
        overlayVisibility: { features: true, algorithmOverlay: true },
        featureGroupVisibility: {},
        overlayToggles: DEFAULT_OVERLAY_TOGGLES,
        panelMode: 'configure',
        heatmapData: null,
        heatmapVisible: true,
        heatmapOpacity: 0.5,
        heatmapColormap: 'magma',
    }),
    setFeatureGroupVisibility: (key, visible) => set((state) => ({
        featureGroupVisibility: { ...state.featureGroupVisibility, [key]: visible },
    })),
    resetFeatureGroupVisibility: () => set({ featureGroupVisibility: {} }),
    setOverlayVisibility: (key, visible) => set((state) => ({
        overlayVisibility: { ...state.overlayVisibility, [key]: visible },
        ...(key === 'features' ? { showFeatures: visible } : {}),
    })),
    setOverlayToggle: (key, value) => set((state) => ({
        overlayToggles: { ...state.overlayToggles, [key]: value },
    })),

    heatmapData: null,
    heatmapVisible: true,
    heatmapOpacity: 0.5,
    heatmapColormap: 'magma',
    setHeatmapData: (data) => set({ heatmapData: data }),
    setHeatmapVisible: (visible) => set({ heatmapVisible: visible }),
    setHeatmapOpacity: (opacity) => set({ heatmapOpacity: opacity }),
    setHeatmapColormap: (colormap) => set({ heatmapColormap: colormap }),
}));
