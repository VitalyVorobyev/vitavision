import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, Eye, EyeOff, Lock, Trash2, Upload } from "lucide-react";

import { exportFeaturesAsJson, promptFeatureImport } from "../featureIo";
import {
    buildFeatureGroups,
    getFeatureGroupKey,
    isFeatureGroupVisible,
} from "../../../store/editor/featureGroups";
import { isReadonlyFeature, useEditorStore, type Feature, type FeatureMeta } from "../../../store/editor/useEditorStore";

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
            ? renderMetaField("Target pos", `${meta.targetPosition.x.toFixed(2)}, ${meta.targetPosition.y.toFixed(2)}`)
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
        meta.distanceCells !== undefined && meta.distanceCells !== null
            ? renderMetaField("Distance (cells)", meta.distanceCells.toFixed(2))
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

/** Compact one-line summary for a feature row in the list. */
function featureRowSummary(feature: Feature): string {
    const meta = feature.meta;

    // Corners (chessboard / charuco / checkerboard_marker)
    if (meta?.kind === "chessboard" || meta?.kind === "charuco" || meta?.kind === "checkerboard_marker") {
        const grid = meta.grid ? `(${meta.grid.i},${meta.grid.j})` : "";
        const score = meta.score !== undefined ? meta.score.toFixed(2) : "";
        return [grid, score].filter(Boolean).join("  ");
    }

    // Markers
    if (meta?.kind === "marker") {
        const id = meta.markerId !== undefined && meta.markerId !== null ? `id:${meta.markerId}` : "";
        const score = meta.score !== undefined ? meta.score.toFixed(2) : "";
        return [id, score].filter(Boolean).join("  ");
    }

    // Circle candidates
    if (meta?.kind === "circle_candidate") {
        const grid = meta.grid ? `(${meta.grid.i},${meta.grid.j})` : "";
        const pol = meta.polarity ?? "";
        return [grid, pol].filter(Boolean).join("  ");
    }

    // Ring markers
    if (meta?.kind === "ringgrid") {
        const id = meta.markerId !== undefined && meta.markerId !== null ? `#${meta.markerId}` : "";
        const score = meta.score !== undefined ? meta.score.toFixed(2) : "";
        return [id, score].filter(Boolean).join("  ");
    }

    // Directed points
    if (feature.type === "directed_point") {
        return `(${feature.x.toFixed(1)}, ${feature.y.toFixed(1)})  ${feature.score.toFixed(2)}`;
    }

    // Manual / other spatial features
    const xy = featureXY(feature);
    if (xy) {
        return `(${xy.x.toFixed(1)}, ${xy.y.toFixed(1)})`;
    }

    return "";
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
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-100">
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
                        <span className="font-medium">{meta.score.toFixed(4)}</span>
                    </div>
                )}
                {/* Directed point score (from feature, not meta) */}
                {feature.type === "directed_point" && (
                    <div>
                        <span className="text-muted-foreground">score </span>
                        <span className="font-medium">{feature.score.toFixed(3)}</span>
                    </div>
                )}
                {/* Coordinates */}
                {xy && (
                    <>
                        <div>
                            <span className="text-muted-foreground">x </span>
                            <span className="font-medium">{xy.x.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">y </span>
                            <span className="font-medium">{xy.y.toFixed(2)}</span>
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
    } = useEditorStore();

    const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;
    const selectedFeatureHidden = selectedFeature
        ? !isFeatureGroupVisible(getFeatureGroupKey(selectedFeature), featureGroupVisibility)
        : false;

    const groups = useMemo(() => buildFeatureGroups(features), [features]);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const listRef = useRef<HTMLDivElement>(null);

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

    const toggleGroup = useCallback((key: string) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    // Build a flat ordered list of visible feature IDs for keyboard navigation
    const flatVisible = useMemo(() => {
        const result: { featureId: string; groupKey: string }[] = [];
        for (const group of groups) {
            if (!collapsed.has(group.key)) {
                for (const f of group.features) {
                    result.push({ featureId: f.id, groupKey: group.key });
                }
            }
        }
        return result;
    }, [groups, collapsed]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();

            if (flatVisible.length === 0) return;

            const currentIndex = selectedFeatureId
                ? flatVisible.findIndex((entry) => entry.featureId === selectedFeatureId)
                : -1;

            let nextIndex: number;
            if (e.key === "ArrowDown") {
                nextIndex = currentIndex < flatVisible.length - 1 ? currentIndex + 1 : 0;
            } else {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : flatVisible.length - 1;
            }

            const next = flatVisible[nextIndex];
            if (collapsed.has(next.groupKey)) {
                setCollapsed((prev) => {
                    const updated = new Set(prev);
                    updated.delete(next.groupKey);
                    return updated;
                });
            }
            setSelectedFeatureId(next.featureId);
        },
        [flatVisible, selectedFeatureId, collapsed, setSelectedFeatureId],
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                <ActionButton title="Import feature JSON" onClick={handleImport}>
                    <Upload size={12} />
                    Import JSON
                </ActionButton>
                <ActionButton
                    title="Export current features"
                    onClick={handleExport}
                    disabled={features.length === 0}
                >
                    <Download size={12} />
                    Export JSON
                </ActionButton>
                <ActionButton
                    title="Clear all features"
                    onClick={handleClear}
                    disabled={features.length === 0}
                    className="border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10"
                >
                    <Trash2 size={12} />
                    Clear features
                </ActionButton>
            </div>

            {selectedFeature && (
                <SelectedFeatureCard
                    feature={selectedFeature}
                    hidden={selectedFeatureHidden}
                    onDelete={() => deleteFeature(selectedFeature.id)}
                />
            )}

            {/* grouped feature list */}
            <div
                ref={listRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className="flex flex-col gap-1 outline-none focus:ring-1 focus:ring-primary/30 rounded-md"
            >
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
                    <div className="space-y-1.5 pb-4">
                        {groups.map((group) => {
                            const isCollapsed = collapsed.has(group.key);
                            const isVisible = isFeatureGroupVisible(group.key, featureGroupVisibility);
                            return (
                                <div key={group.key}>
                                    {/* group header */}
                                    <div className={`flex items-center gap-1 rounded-md transition-colors ${isVisible ? "hover:bg-muted/30" : "opacity-55 hover:bg-muted/20"}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group.key)}
                                            className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-xs text-left"
                                        >
                                            <ChevronRight
                                                size={12}
                                                className={`text-muted-foreground/60 transition-transform duration-150 ${
                                                    isCollapsed ? "" : "rotate-90"
                                                }`}
                                            />
                                            <div
                                                className="w-2 h-2 rounded-xs shrink-0"
                                                style={{ backgroundColor: group.color }}
                                            />
                                            <span className="font-medium text-foreground truncate">{group.label}</span>
                                            <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                                                {group.features.length}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFeatureGroupVisibility(group.key, !isVisible)}
                                            className="mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                            title={isVisible ? `Hide ${group.label}` : `Show ${group.label}`}
                                        >
                                            {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                                        </button>
                                    </div>

                                    {/* group items */}
                                    {!isCollapsed && (
                                        <div className={`space-y-0.5 mt-0.5 ml-3 ${isVisible ? "" : "opacity-50"}`}>
                                            {group.features.map((feature, idx) => {
                                                const isSelected = selectedFeatureId === feature.id;
                                                const summary = featureRowSummary(feature);
                                                return (
                                                    <div
                                                        key={feature.id}
                                                        onClick={() => setSelectedFeatureId(feature.id)}
                                                        className={`flex items-center gap-2 px-2 py-1 rounded-md border cursor-pointer text-xs transition-colors ${
                                                            isSelected
                                                                ? "border-primary/40 bg-primary/6 shadow-xs"
                                                                : "border-transparent hover:border-muted-foreground/25 hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <span className="text-[10px] text-muted-foreground tabular-nums w-5 shrink-0 text-right">
                                                            {idx}
                                                        </span>
                                                        <span className="text-[11px] text-foreground/80 tabular-nums truncate">
                                                            {summary}
                                                        </span>
                                                        {!isReadonlyFeature(feature) && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteFeature(feature.id); }}
                                                                className="p-0.5 text-muted-foreground/40 hover:text-destructive shrink-0 transition-colors ml-auto"
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
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
