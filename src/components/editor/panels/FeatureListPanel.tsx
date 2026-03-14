import { Lock, Trash2 } from "lucide-react";

import { isReadonlyFeature, useEditorStore, type Feature, type FeatureMeta } from "../../../store/editor/useEditorStore";

const chipClassForSource = (feature: Feature): string => {
    if (feature.source === "manual") {
        return "bg-muted text-muted-foreground";
    }
    return "bg-primary/12 text-primary";
};

const displaySource = (feature: Feature): string => {
    if (feature.source === "manual") {
        return "manual";
    }
    return feature.algorithmId ?? "algorithm";
};

const renderMetaField = (
    label: string,
    value: string | number | boolean | null | undefined,
): React.ReactNode | null => {
    if (value === null || value === undefined) {
        return null;
    }
    const formatted = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
    return (
        <div key={label}>
            <span className="text-muted-foreground">{label} </span>
            <span className="font-medium">{formatted}</span>
        </div>
    );
};

const renderMetaRows = (meta: FeatureMeta): React.ReactNode[] => {
    const rows: (React.ReactNode | null)[] = [
        renderMetaField("Kind", meta.kind),
        renderMetaField("Score", meta.score !== undefined && meta.score !== null ? meta.score.toFixed(4) : meta.score),
        meta.grid !== undefined
            ? renderMetaField("Grid", `i=${meta.grid.i}, j=${meta.grid.j}`)
            : null,
        meta.gridCell !== undefined
            ? renderMetaField("Grid cell", `gx=${meta.gridCell.gx}, gy=${meta.gridCell.gy}`)
            : null,
        renderMetaField("Corner ID", meta.cornerId),
        renderMetaField("Marker ID", meta.markerId),
        meta.targetPosition !== undefined && meta.targetPosition !== null
            ? renderMetaField("Target pos", `x=${meta.targetPosition.x.toFixed(2)}, y=${meta.targetPosition.y.toFixed(2)}`)
            : null,
        meta.rotation !== undefined
            ? renderMetaField("Rotation", `${meta.rotation.toFixed(1)}°`)
            : null,
        renderMetaField("Hamming", meta.hamming),
        meta.borderScore !== undefined && meta.borderScore !== null
            ? renderMetaField("Border score", meta.borderScore.toFixed(4))
            : null,
        renderMetaField("Code", meta.code),
        renderMetaField("Inverted", meta.inverted),
        renderMetaField("Polarity", meta.polarity),
        meta.contrast !== undefined && meta.contrast !== null
            ? renderMetaField("Contrast", meta.contrast.toFixed(3))
            : null,
        renderMetaField("Distance (cells)", meta.distanceCells),
        meta.offsetCells !== undefined && meta.offsetCells !== null
            ? renderMetaField("Offset (cells)", `di=${meta.offsetCells.di}, dj=${meta.offsetCells.dj}`)
            : null,
    ];
    return rows.filter((row): row is React.ReactNode => row !== null);
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
        <div className="flex flex-col gap-3">

            {selectedFeature && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                            Selected
                        </span>
                        {isReadonlyFeature(selectedFeature) && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                <Lock size={9} /> read-only
                            </span>
                        )}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground truncate">{selectedFeature.id}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div>
                            <span className="text-muted-foreground">type </span>
                            <span className="font-medium">{selectedFeature.type}</span>
                        </div>
                        {selectedFeature.type === "directed_point" && (
                            <>
                                <div>
                                    <span className="text-muted-foreground">x </span>
                                    <span className="font-medium">{selectedFeature.x.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">y </span>
                                    <span className="font-medium">{selectedFeature.y.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">score </span>
                                    <span className="font-medium">{selectedFeature.score.toFixed(3)}</span>
                                </div>
                            </>
                        )}
                    </div>
                    {selectedFeature.source === "algorithm" && selectedFeature.meta && (
                        <div className="pt-1 space-y-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                                Metadata
                            </span>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                {renderMetaRows(selectedFeature.meta)}
                            </div>
                        </div>
                    )}
                    {!isReadonlyFeature(selectedFeature) && (
                        <button
                            onClick={() => deleteFeature(selectedFeature.id)}
                            className="flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/70 transition-colors mt-1"
                        >
                            <Trash2 size={11} /> Delete
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-[0.12em]">
                        List
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{features.length}</span>
                </div>

                {features.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 py-6 text-center">
                        <p className="text-xs text-muted-foreground">No features yet</p>
                    </div>
                ) : (
                    <div className="space-y-1 pb-4">
                        {features.map((feature) => {
                            const readonly = isReadonlyFeature(feature);
                            const isSelected = selectedFeatureId === feature.id;
                            return (
                                <div
                                    key={feature.id}
                                    onClick={() => setSelectedFeatureId(feature.id)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer text-xs transition-colors ${
                                        isSelected
                                            ? "border-primary/40 bg-primary/6 shadow-xs"
                                            : "border-border/70 bg-background hover:border-muted-foreground/25 hover:bg-muted/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="w-2 h-2 rounded-xs shrink-0"
                                            style={{ backgroundColor: featureSwatch(feature) }}
                                        />
                                        <span className="truncate font-medium text-foreground">{feature.type}</span>
                                        <span className={`text-[10px] px-1.5 py-px rounded-full shrink-0 ${chipClassForSource(feature)}`}>
                                            {displaySource(feature)}
                                        </span>
                                        {readonly && <Lock size={10} className="text-muted-foreground/50 shrink-0" />}
                                    </div>

                                    {!readonly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteFeature(feature.id); }}
                                            className="p-0.5 text-muted-foreground/40 hover:text-destructive shrink-0 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
