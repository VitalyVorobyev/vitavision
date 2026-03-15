import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronRight, Lock, Trash2 } from "lucide-react";

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

/** Extract (x, y) from any spatial feature. */
function featureXY(feature: Feature): { x: number; y: number } | null {
    if (feature.type === "point" || feature.type === "directed_point") {
        return { x: feature.x, y: feature.y };
    }
    if (feature.type === "bbox" || feature.type === "ellipse") {
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

/* ── grouping ────────────────────────────────────────────────── */

interface FeatureGroup {
    key: string;
    label: string;
    color: string;
    features: Feature[];
}

const KIND_LABELS: Record<string, string> = {
    chessboard: "Corners",
    charuco: "Corners",
    checkerboard_marker: "Corners",
    marker: "Markers",
    circle_candidate: "Circle candidates",
};

const TYPE_LABELS: Record<string, string> = {
    point: "Points",
    line: "Lines",
    polyline: "Polylines",
    bbox: "Bounding boxes",
    ellipse: "Ellipses",
    directed_point: "Directed points",
};

function groupKey(feature: Feature): string {
    if (feature.source === "algorithm" && feature.meta?.kind) {
        return `algo:${feature.meta.kind}`;
    }
    return `type:${feature.type}`;
}

function groupLabel(key: string): string {
    const [prefix, value] = key.split(":");
    if (prefix === "algo") {
        return KIND_LABELS[value] ?? value;
    }
    return TYPE_LABELS[value] ?? value;
}

function buildGroups(features: Feature[]): FeatureGroup[] {
    const map = new Map<string, Feature[]>();
    const order: string[] = [];
    for (const f of features) {
        const k = groupKey(f);
        if (!map.has(k)) {
            map.set(k, []);
            order.push(k);
        }
        map.get(k)!.push(f);
    }
    return order.map((k) => {
        const items = map.get(k)!;
        return {
            key: k,
            label: groupLabel(k),
            color: featureSwatch(items[0]),
            features: items,
        };
    });
}

/* ── selected feature card ───────────────────────────────────── */

function SelectedFeatureCard({ feature, onDelete }: { feature: Feature; onDelete: () => void }) {
    const readonly = isReadonlyFeature(feature);
    const meta = feature.meta;
    const xy = featureXY(feature);

    return (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Selected
                </span>
                {readonly && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <Lock size={9} /> read-only
                    </span>
                )}
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

/* ── main component ──────────────────────────────────────────── */

export default function FeatureListPanel() {
    const {
        features,
        selectedFeatureId,
        setSelectedFeatureId,
        deleteFeature,
    } = useEditorStore();

    const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;

    const groups = useMemo(() => buildGroups(features), [features]);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const listRef = useRef<HTMLDivElement>(null);

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

            {selectedFeature && (
                <SelectedFeatureCard
                    feature={selectedFeature}
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
                            return (
                                <div key={group.key}>
                                    {/* group header */}
                                    <button
                                        onClick={() => toggleGroup(group.key)}
                                        className="flex items-center gap-1.5 w-full px-1 py-1 text-xs rounded-md hover:bg-muted/30 transition-colors"
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
                                        <span className="font-medium text-foreground">{group.label}</span>
                                        <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                                            {group.features.length}
                                        </span>
                                    </button>

                                    {/* group items */}
                                    {!isCollapsed && (
                                        <div className="space-y-0.5 mt-0.5 ml-3">
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
