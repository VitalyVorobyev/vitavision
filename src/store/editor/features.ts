import { featureSchema } from './featureSchema';
import type { Feature, FeatureSource } from './editorTypes';

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
