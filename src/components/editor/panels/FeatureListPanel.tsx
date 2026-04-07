import { useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Lock, Trash2, Upload } from "lucide-react";

import { exportFeaturesAsJson, promptFeatureImport } from "../featureIo";
import {
    buildFeatureGroups,
    getFeatureGroupKey,
    isFeatureGroupVisible,
} from "../../../store/editor/featureGroups";
import { isReadonlyFeature, useEditorStore, type Feature, type FeatureMeta } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { fmtCoord, fmtScore, fmtDistance } from "./formatNumber";

/* ── helpers ─────────────────────────────────────────────────── */

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

/** Render meta fields for the selected-feature card, excluding fields already shown prominently. */
const renderDetailMeta = (meta: FeatureMeta): React.ReactNode[] => {
    const rows: (React.ReactNode | null)[] = [
        renderMetaField("Corner ID", meta.cornerId),
        renderMetaField("Marker ID", meta.markerId),
        meta.targetPosition !== undefined && meta.targetPosition !== null
            ? renderMetaField("Target pos", `${fmtCoord(meta.targetPosition.x)}, ${fmtCoord(meta.targetPosition.y)}`)
            : null,
        meta.rotation !== undefined
            ? renderMetaField("Rotation", `${meta.rotation.toFixed(1)}°`)
            : null,
        renderMetaField("Hamming", meta.hamming),
        meta.borderScore !== undefined && meta.borderScore !== null
            ? renderMetaField("Border score", fmtScore(meta.borderScore))
            : null,
        renderMetaField("Code", meta.code),
        renderMetaField("Inverted", meta.inverted),
        renderMetaField("Polarity", meta.polarity),
        meta.contrast !== undefined && meta.contrast !== null
            ? renderMetaField("Contrast", fmtScore(meta.contrast))
            : null,
        meta.distanceCells !== undefined && meta.distanceCells !== null
            ? renderMetaField("Distance (cells)", fmtDistance(meta.distanceCells))
            : null,
        meta.offsetCells !== undefined && meta.offsetCells !== null
            ? renderMetaField("Offset (cells)", `di=${meta.offsetCells.di}, dj=${meta.offsetCells.dj}`)
            : null,
    ];
    return rows.filter((row): row is React.ReactNode => row !== null);
};

/** Extract (x, y) from any spatial feature. */
function featureXY(feature: Feature): { x: number; y: number } | null {
    if (feature.type === "point" || feature.type === "directed_point") {
        return { x: feature.x, y: feature.y };
    }
    if (feature.type === "bbox" || feature.type === "ellipse" || feature.type === "ring_marker" || feature.type === "aruco_marker") {
        return { x: feature.x, y: feature.y };
    }
    if (feature.type === "line") {
        return { x: feature.points[0], y: feature.points[1] };
    }
    if (feature.type === "polyline" && feature.points.length >= 2) {
        return { x: feature.points[0], y: feature.points[1] };
    }
    return null;
}

/* ── feature navigator ──────────────────────────────────────── */

function FeatureNavigator({
    flatFeatureIds,
    selectedFeatureId,
    setSelectedFeatureId,
}: {
    flatFeatureIds: string[];
    selectedFeatureId: string | null;
    setSelectedFeatureId: (id: string) => void;
}) {
    const total = flatFeatureIds.length;
    const currentIndex = selectedFeatureId
        ? flatFeatureIds.indexOf(selectedFeatureId)
        : -1;

    const goPrev = useCallback(() => {
        if (total === 0) return;
        const next = currentIndex > 0 ? currentIndex - 1 : total - 1;
        setSelectedFeatureId(flatFeatureIds[next]);
    }, [currentIndex, total, flatFeatureIds, setSelectedFeatureId]);

    const goNext = useCallback(() => {
        if (total === 0) return;
        const next = currentIndex < total - 1 ? currentIndex + 1 : 0;
        setSelectedFeatureId(flatFeatureIds[next]);
    }, [currentIndex, total, flatFeatureIds, setSelectedFeatureId]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                goPrev();
            } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                goNext();
            }
        },
        [goPrev, goNext],
    );

    if (total === 0) return null;

    const display = currentIndex >= 0 ? `${currentIndex + 1} / ${total}` : `— / ${total}`;

    return (
        <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="flex items-center justify-center gap-3 outline-none focus:ring-1 focus:ring-primary/30 rounded-md py-1"
        >
            <button
                type="button"
                onClick={goPrev}
                disabled={total === 0}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-30"
                title="Previous feature"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="text-xs tabular-nums text-foreground font-medium min-w-[4rem] text-center">
                {display}
            </span>
            <button
                type="button"
                onClick={goNext}
                disabled={total === 0}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-30"
                title="Next feature"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}
/* ── selected feature card ───────────────────────────────────── */

function SelectedFeatureCard({
    feature,
    hidden,
    onDelete,
}: {
    feature: Feature;
    hidden: boolean;
    onDelete: () => void;
}) {
    const readonly = isReadonlyFeature(feature);
    const meta = feature.meta;
    const xy = featureXY(feature);

    return (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Selected
                </span>
                <div className="flex items-center gap-1.5">
                    {hidden && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <EyeOff size={9} /> hidden
                        </span>
                    )}
                    {readonly && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Lock size={9} /> read-only
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {/* Grid coords prominently for corners */}
                {meta?.grid && (
                    <div>
                        <span className="text-muted-foreground">grid </span>
                        <span className="font-medium">({meta.grid.i}, {meta.grid.j})</span>
                    </div>
                )}
                {/* Grid cell for markers */}
                {meta?.gridCell && !meta?.grid && (
                    <div>
                        <span className="text-muted-foreground">cell </span>
                        <span className="font-medium">({meta.gridCell.gx}, {meta.gridCell.gy})</span>
                    </div>
                )}
                {/* Score */}
                {meta?.score !== undefined && meta?.score !== null && (
                    <div>
                        <span className="text-muted-foreground">score </span>
                        <span className="font-medium tabular-nums">{fmtScore(meta.score)}</span>
                    </div>
                )}
                {/* Directed point score (from feature, not meta) */}
                {feature.type === "directed_point" && (
                    <div>
                        <span className="text-muted-foreground">score </span>
                        <span className="font-medium tabular-nums">{fmtScore(feature.score)}</span>
                    </div>
                )}
                {/* Coordinates */}
                {xy && (
                    <>
                        <div>
                            <span className="text-muted-foreground">x </span>
                            <span className="font-medium tabular-nums">{fmtCoord(xy.x)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">y </span>
                            <span className="font-medium tabular-nums">{fmtCoord(xy.y)}</span>
                        </div>
                    </>
                )}
                {/* Remaining meta fields */}
                {meta && renderDetailMeta(meta)}
            </div>

            {!readonly && (
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/70 transition-colors mt-0.5"
                >
                    <Trash2 size={11} /> Delete
                </button>
            )}
        </div>
    );
}

function ActionButton({
    children,
    className,
    disabled,
    onClick,
    title,
}: {
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onClick: () => void;
    title: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${className ?? "border-border bg-background text-foreground hover:bg-muted/50"}`}
        >
            {children}
        </button>
    );
}

/* ── main component ──────────────────────────────────────────── */

export default function FeatureListPanel() {
    const {
        features,
        selectedFeatureId,
        setSelectedFeatureId,
        setFeatures,
        clearFeatures,
        deleteFeature,
        featureGroupVisibility,
        setFeatureGroupVisibility,
    } = useEditorStore(useShallow((s) => ({
        features: s.features,
        selectedFeatureId: s.selectedFeatureId,
        setSelectedFeatureId: s.setSelectedFeatureId,
        setFeatures: s.setFeatures,
        clearFeatures: s.clearFeatures,
        deleteFeature: s.deleteFeature,
        featureGroupVisibility: s.featureGroupVisibility,
        setFeatureGroupVisibility: s.setFeatureGroupVisibility,
    })));

    const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;
    const selectedFeatureHidden = selectedFeature
        ? !isFeatureGroupVisible(getFeatureGroupKey(selectedFeature), featureGroupVisibility)
        : false;

    const groups = useMemo(() => buildFeatureGroups(features), [features]);

    // Flat ordered list of all feature IDs for navigator
    const flatFeatureIds = useMemo(() => {
        const ids: string[] = [];
        for (const group of groups) {
            for (const f of group.features) {
                ids.push(f.id);
            }
        }
        return ids;
    }, [groups]);

    const handleImport = useCallback(() => {
        promptFeatureImport({
            currentFeatureCount: features.length,
            onLoaded: (imported) => {
                clearFeatures();
                setFeatures(imported);
            },
        });
    }, [clearFeatures, features.length, setFeatures]);

    const handleExport = useCallback(() => {
        exportFeaturesAsJson(features);
    }, [features]);

    const handleClear = useCallback(() => {
        if (features.length === 0) {
            return;
        }
        if (!window.confirm("Clear all features and reset the current results for this image?")) {
            return;
        }
        clearFeatures();
    }, [clearFeatures, features.length]);

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-1.5">
                <ActionButton title="Import feature JSON" onClick={handleImport}>
                    <Upload size={12} />
                    Import
                </ActionButton>
                <ActionButton
                    title="Export current features"
                    onClick={handleExport}
                    disabled={features.length === 0}
                >
                    <Download size={12} />
                    Export
                </ActionButton>
                <ActionButton
                    title="Clear all features"
                    onClick={handleClear}
                    disabled={features.length === 0}
                    className="border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                >
                    <Trash2 size={12} />
                    Clear
                </ActionButton>
            </div>

            {selectedFeature && (
                <SelectedFeatureCard
                    feature={selectedFeature}
                    hidden={selectedFeatureHidden}
                    onDelete={() => deleteFeature(selectedFeature.id)}
                />
            )}

            {/* Feature navigator */}
            <FeatureNavigator
                flatFeatureIds={flatFeatureIds}
                selectedFeatureId={selectedFeatureId}
                setSelectedFeatureId={setSelectedFeatureId}
            />

            {/* Group visibility pills */}
            {groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {groups.map((group) => {
                        const isVisible = isFeatureGroupVisible(group.key, featureGroupVisibility);
                        return (
                            <button
                                key={group.key}
                                type="button"
                                onClick={() => setFeatureGroupVisibility(group.key, !isVisible)}
                                className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border transition-colors ${
                                    isVisible
                                        ? "border-border bg-background text-foreground hover:bg-muted/50"
                                        : "border-border/50 bg-muted/20 text-muted-foreground/60 hover:bg-muted/40"
                                }`}
                                title={isVisible ? `Hide ${group.label}` : `Show ${group.label}`}
                            >
                                <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: group.color, opacity: isVisible ? 1 : 0.4 }}
                                />
                                <span className="font-medium">{group.label}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {group.features.length}
                                </span>
                                {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                            </button>
                        );
                    })}
                </div>
            )}

            {features.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/60 py-6 text-center">
                    <p className="text-xs text-muted-foreground">No features yet</p>
                </div>
            )}
        </div>
    );
}
