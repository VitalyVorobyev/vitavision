import { create } from 'zustand';
import type {
    SampleId,
    Feature,
    GalleryImage,
    ToolType,
    PanelMode,
    OverlayVisibilityKey,
    OverlayToggles,
    RunHistoryEntry,
} from './editorTypes';
import { normalizeFeature, normalizeImportedFeatures, isReadonlyFeature } from './features';
import { SAMPLE_GALLERY_IMAGES } from './galleryImages';

// Re-export everything that used to live directly in this file so existing
// importers (types and helpers alike) keep working unchanged.
export type {
    ToolType,
    FeatureType,
    FeatureSource,
    SampleId,
    Point2D,
    GridCoords,
    GridCell,
    CellOffset,
    FeatureMeta,
    BaseFeature,
    PointFeature,
    LineFeature,
    PolylineFeature,
    PolygonFeature,
    BBoxFeature,
    EllipseFeature,
    DirectedAxis,
    DirectedPointFeature,
    RingMarkerEllipse,
    RingMarkerFeature,
    ArUcoMarkerFeature,
    CircleFeature,
    LabeledPointFeature,
    Feature,
    GalleryImage,
    PanelMode,
    OverlayVisibilityKey,
    OverlayToggles,
    RunSummaryEntry,
    RunHistoryEntry,
} from './editorTypes';
export { normalizeFeature, normalizeImportedFeatures, isReadonlyFeature };

const DEFAULT_OVERLAY_TOGGLES: OverlayToggles = {
    edges: true,
    labels: false,
};

const MAX_RUN_HISTORY = 20;

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

    galleryMode: true,
    galleryImages: SAMPLE_GALLERY_IMAGES,
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
