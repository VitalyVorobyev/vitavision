import { Lock, Trash2 } from "lucide-react";

import { isReadonlyFeature, useEditorStore, type Feature } from "../../../store/editor/useEditorStore";

const chipClassForSource = (feature: Feature): string => {
    if (feature.source === "manual") {
        return "bg-muted text-muted-foreground";
    }
    return "bg-primary/15 text-primary";
};

const displaySource = (feature: Feature): string => {
    if (feature.source === "manual") {
        return "manual";
    }
    return feature.algorithmId ?? "algorithm";
};

const featureSwatch = (feature: Feature): string => {
    if (feature.color) {
        return feature.color;
    }
    if (feature.type === "directed_point") {
        return "#60a5fa";
    }
    return "#9ca3af";
};

export default function FeatureListPanel() {
    const {
        features,
        selectedFeatureId,
        setSelectedFeatureId,
        deleteFeature,
    } = useEditorStore();

    const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Features</h2>

            {selectedFeature && (
                <div className="text-xs p-3 mb-4 rounded-md border border-primary/20 bg-primary/5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-primary">Selected</div>
                        {isReadonlyFeature(selectedFeature) && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                <Lock size={11} /> Read-only
                            </span>
                        )}
                    </div>
                    <div className="font-mono truncate">{selectedFeature.id}</div>
                    <div className="text-muted-foreground">Type: {selectedFeature.type}</div>
                    {selectedFeature.type === "directed_point" && (
                        <>
                            <div className="text-muted-foreground">x: {selectedFeature.x.toFixed(3)}</div>
                            <div className="text-muted-foreground">y: {selectedFeature.y.toFixed(3)}</div>
                            <div className="text-muted-foreground">score: {selectedFeature.score.toFixed(3)}</div>
                        </>
                    )}
                    {!isReadonlyFeature(selectedFeature) && (
                        <button
                            onClick={() => deleteFeature(selectedFeature.id)}
                            className="text-destructive hover:text-destructive/80 mt-1 flex items-center gap-1 font-medium"
                        >
                            <Trash2 size={12} /> Delete Feature
                        </button>
                    )}
                </div>
            )}

            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">List ({features.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-10">
                {features.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-border border-dashed p-4 rounded-md text-center">
                        No features yet
                    </div>
                ) : (
                    features.map((feature) => {
                        const readonly = isReadonlyFeature(feature);
                        return (
                            <div
                                key={feature.id}
                                onClick={() => setSelectedFeatureId(feature.id)}
                                className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-sm transition-colors ${selectedFeatureId === feature.id ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-background hover:border-muted-foreground/30"}`}
                            >
                                <div className="flex items-center space-x-2 truncate">
                                    <div
                                        className="w-3 h-3 rounded-xs shrink-0"
                                        style={{ backgroundColor: featureSwatch(feature) }}
                                    />
                                    <span className="truncate font-medium">{feature.type}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${chipClassForSource(feature)}`}>
                                        {displaySource(feature)}
                                    </span>
                                    {readonly && <Lock size={12} className="text-muted-foreground" />}
                                </div>

                                {!readonly && (
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            deleteFeature(feature.id);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                        title="Delete feature"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
