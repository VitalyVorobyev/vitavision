import { create } from 'zustand';

export type ToolType = 'SELECT' | 'POINT' | 'LINE' | 'POLYLINE' | 'BBOX' | 'ELLIPSE';
export type FeatureType = 'point' | 'line' | 'polyline' | 'bbox' | 'ellipse' | 'directed_point';
export type FeatureSource = 'manual' | 'algorithm';

export interface Point2D {
    x: number;
    y: number;
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

export type Feature =
    | PointFeature
    | LineFeature
    | PolylineFeature
    | BBoxFeature
    | EllipseFeature
    | DirectedPointFeature;

export interface GalleryImage {
    id: string;
    src: string;
    name: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

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
        .filter((item): item is Record<string, unknown> => isObjectRecord(item))
        .filter((item) => typeof item.id === 'string' && typeof item.type === 'string')
        .map((item) => {
            const source: FeatureSource = item.source === 'algorithm' ? 'algorithm' : 'manual';
            const readonly = typeof item.readonly === 'boolean' ? item.readonly : source === 'algorithm';
            return ({
                ...item,
                source,
                readonly,
            } as unknown) as Feature;
        });
};

export const isReadonlyFeature = (feature: Feature): boolean => {
    return feature.readonly === true;
};

interface EditorState {
    imageSrc: string | null;
    imageName: string | null;
    imageWidth: number;
    imageHeight: number;

    activeTool: ToolType;
    selectedFeatureId: string | null;
    features: Feature[];

    zoom: number;
    pan: { x: number; y: number };
    showFeatures: boolean;

    galleryMode: boolean;
    galleryImages: GalleryImage[];

    setImage: (src: string, width: number, height: number, name?: string) => void;
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
}

export const useEditorStore = create<EditorState>((set) => ({
    imageSrc: null,
    imageName: null,
    imageWidth: 0,
    imageHeight: 0,

    activeTool: 'SELECT',
    selectedFeatureId: null,
    features: [],

    zoom: 1,
    pan: { x: 0, y: 0 },

    setImage: (src, width, height, name) => set({
        imageSrc: src,
        imageName: name ?? null,
        imageWidth: width,
        imageHeight: height,
    }),
    setActiveTool: (tool) => set({ activeTool: tool, selectedFeatureId: null }),
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
    setShowFeatures: (show) => set({ showFeatures: show }),

    galleryMode: true,
    galleryImages: [
        { id: '1', src: 'https://images.unsplash.com/photo-1549480017-d76466a4b7e8?auto=format&fit=crop&q=80&w=800', name: 'Sample Office' },
        { id: '2', src: 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?auto=format&fit=crop&q=80&w=800', name: 'Sample Street' },
        { id: '3', src: 'https://images.unsplash.com/photo-1563207153-f404bef274b6?auto=format&fit=crop&q=80&w=800', name: 'Sample Portrait' },
    ],
    setGalleryMode: (mode) => set({ galleryMode: mode }),
    addGalleryImage: (img) => set((state) => ({ galleryImages: [...state.galleryImages, img] })),
}));
