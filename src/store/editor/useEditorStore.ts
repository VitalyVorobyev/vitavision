import { create } from 'zustand';

export type ToolType = 'SELECT' | 'POINT' | 'LINE' | 'POLYLINE' | 'BBOX' | 'ELLIPSE';
export type FeatureType = 'point' | 'line' | 'polyline' | 'bbox' | 'ellipse';

export interface Point2D {
    x: number;
    y: number;
}

export interface BaseFeature {
    id: string;
    type: FeatureType;
    color?: string;
    label?: string;
}

export interface PointFeature extends BaseFeature {
    type: 'point';
    x: number;
    y: number;
    // Optional for "Directed Feature"
    angle?: number;
}

export interface LineFeature extends BaseFeature {
    type: 'line';
    points: [number, number, number, number]; // x1, y1, x2, y2
}

export interface PolylineFeature extends BaseFeature {
    type: 'polyline';
    points: number[]; // [x1, y1, x2, y2, ...]
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

export type Feature = PointFeature | LineFeature | PolylineFeature | BBoxFeature | EllipseFeature;

export interface GalleryImage {
    id: string;
    src: string;
    name: string;
}

interface EditorState {
    imageSrc: string | null;
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

    // Actions
    setImage: (src: string, width: number, height: number) => void;
    setActiveTool: (tool: ToolType) => void;
    setSelectedFeatureId: (id: string | null) => void;

    addFeature: (f: Feature) => void;
    updateFeature: (id: string, partial: Partial<Feature>) => void;
    deleteFeature: (id: string) => void;
    setFeatures: (features: Feature[]) => void;

    setZoom: (zoom: number) => void;
    setPan: (pan: { x: number; y: number }) => void;
    setShowFeatures: (show: boolean) => void;

    setGalleryMode: (mode: boolean) => void;
    addGalleryImage: (img: GalleryImage) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    imageSrc: null,
    imageWidth: 0,
    imageHeight: 0,

    activeTool: 'SELECT',
    selectedFeatureId: null,
    features: [],

    zoom: 1,
    pan: { x: 0, y: 0 },

    setImage: (src, width, height) => set({ imageSrc: src, imageWidth: width, imageHeight: height }),
    setActiveTool: (tool) => set({ activeTool: tool, selectedFeatureId: null }), // Deselect when switching tools
    setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),

    addFeature: (f) => set((state) => ({ features: [...state.features, f] })),

    updateFeature: (id, partial) => set((state) => ({
        features: state.features.map(f => f.id === id ? { ...f, ...partial } as Feature : f)
    })),

    deleteFeature: (id) => set((state) => ({
        features: state.features.filter(f => f.id !== id),
        selectedFeatureId: state.selectedFeatureId === id ? null : state.selectedFeatureId
    })),

    setFeatures: (features) => set({ features }),

    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),

    showFeatures: true,
    setShowFeatures: (show: boolean) => set({ showFeatures: show }),

    // Gallery state
    galleryMode: true, // Start in gallery mode by default
    galleryImages: [
        { id: '1', src: 'https://images.unsplash.com/photo-1549480017-d76466a4b7e8?auto=format&fit=crop&q=80&w=800', name: 'Sample Office' },
        { id: '2', src: 'https://images.unsplash.com/photo-1517404215738-15263e9f9178?auto=format&fit=crop&q=80&w=800', name: 'Sample Street' },
        { id: '3', src: 'https://images.unsplash.com/photo-1563207153-f404bef274b6?auto=format&fit=crop&q=80&w=800', name: 'Sample Portrait' }
    ],
    setGalleryMode: (mode) => set({ galleryMode: mode }),
    addGalleryImage: (img) => set((state) => ({ galleryImages: [...state.galleryImages, img] }))
}));
