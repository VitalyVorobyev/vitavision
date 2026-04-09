import { Fragment, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Lock, Trash2, Upload } from "lucide-react";

import { exportFeaturesAsJson, promptFeatureImport } from "../featureIo";
import {
    buildFeatureGroups,
    getFeatureGroupKey,
    isFeatureGroupVisible,
    type FeatureGroup,
} from "../../../store/editor/featureGroups";
import { isReadonlyFeature, useEditorStore, type Feature, type FeatureMeta } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { fmtCoord, fmtScore, fmtDistance } from "./formatNumber";

/* ── helpers ─────────────────────────────────────────────────── */

interface MetaRow {
    label: string;
    value: string;
}

/** Build meta field rows for the selected-feature card, excluding fields already shown prominently (position, score, grid). */
function buildDetailMeta(meta: FeatureMeta): MetaRow[] {
    const rows: (MetaRow | null)[] = [
        meta.cornerId !== undefined && meta.cornerId !== null
            ? { label: "Corner ID", value: String(meta.cornerId) }
            : null,
        meta.markerId !== undefined && meta.markerId !== null
            ? { label: "Marker ID", value: String(meta.markerId) }
            : null,
        meta.targetPosition !== undefined && meta.targetPosition !== null
            ? { label: "Target pos", value: `${fmtCoord(meta.targetPosition.x)}, ${fmtCoord(meta.targetPosition.y)}` }
            : null,
        meta.rotation !== undefined
            ? { label: "Rotation", value: `${meta.rotation.toFixed(1)}°` }
            : null,
        meta.hamming !== undefined && meta.hamming !== null
            ? { label: "Hamming", value: String(meta.hamming) }
            : null,
        meta.borderScore !== undefined && meta.borderScore !== null
            ? { label: "Border score", value: fmtScore(meta.borderScore) }
            : null,
        meta.code !== undefined && meta.code !== null
            ? { label: "Code", value: String(meta.code) }
            : null,
        meta.inverted !== undefined && meta.inverted !== null
            ? { label: "Inverted", value: meta.inverted ? "yes" : "no" }
            : null,
        meta.polarity !== undefined && meta.polarity !== null
            ? { label: "Polarity", value: String(meta.polarity) }
            : null,
        meta.contrast !== undefined && meta.contrast !== null
            ? { label: "Contrast", value: fmtScore(meta.contrast) }
            : null,
        meta.distanceCells !== undefined && meta.distanceCells !== null
            ? { label: "Distance", value: `${fmtDistance(meta.distanceCells)} cells` }
            : null,
        meta.offsetCells !== undefined && meta.offsetCells !== null
            ? { label: "Offset", value: `di=${meta.offsetCells.di}, dj=${meta.offsetCells.dj}` }
            : null,
    ];
    return rows.filter((r): r is MetaRow => r !== null);
}

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
    groups,
    selectedFeatureId,
    setSelectedFeatureId,
}: {
    groups: FeatureGroup[];
    selectedFeatureId: string | null;
    setSelectedFeatureId: (id: string) => void;
}) {
    // Find which group the selected feature belongs to
    const activeGroupIndex = useMemo(() => {
        if (!selectedFeatureId) return -1;
        return groups.findIndex((g) => g.features.some((f) => f.id === selectedFeatureId));
    }, [groups, selectedFeatureId]);

    const group = activeGroupIndex >= 0 ? groups[activeGroupIndex] : null;

    const indexInGroup = useMemo(() => {
        if (!group || !selectedFeatureId) return -1;
        return group.features.findIndex((f) => f.id === selectedFeatureId);
    }, [group, selectedFeatureId]);

    const ids = useMemo(() => group?.features.map((f) => f.id) ?? [], [group]);
    const total = ids.length;

    const goPrev = useCallback(() => {
        if (total === 0) return;
        const next = indexInGroup > 0 ? indexInGroup - 1 : total - 1;
        setSelectedFeatureId(ids[next]);
    }, [indexInGroup, total, ids, setSelectedFeatureId]);

    const goNext = useCallback(() => {
        if (total === 0) return;
        const next = indexInGroup < total - 1 ? indexInGroup + 1 : 0;
        setSelectedFeatureId(ids[next]);
    }, [indexInGroup, total, ids, setSelectedFeatureId]);

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

    const display = indexInGroup >= 0
        ? `${indexInGroup + 1} / ${total}`
        : `— / ${total}`;

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
            <span className="text-xs text-foreground font-medium text-center">
                {group && (
                    <span className="text-muted-foreground">{group.label} </span>
                )}
                <span className="tabular-nums">{display}</span>
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

    // Resolve score from meta or directed_point feature
    const score = meta?.score ?? (feature.type === "directed_point" ? feature.score : null);
    const detailRows = meta ? buildDetailMeta(meta) : [];

    return (
        <div className="rounded-lg border border-primary/30 bg-primary/6 px-4 py-3 space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
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

            {/* Tabular key-value layout */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {xy && (
                    <>
                        <dt className="text-muted-foreground whitespace-nowrap">Position</dt>
                        <dd className="font-medium tabular-nums text-right">
                            {fmtCoord(xy.x)}, {fmtCoord(xy.y)}
                        </dd>
                    </>
                )}
                {score !== null && (
                    <>
                        <dt className="text-muted-foreground">Score</dt>
                        <dd className="font-medium tabular-nums text-right">{fmtScore(score)}</dd>
                    </>
                )}
                {meta?.grid && (
                    <>
                        <dt className="text-muted-foreground">Grid</dt>
                        <dd className="font-medium tabular-nums text-right">({meta.grid.i}, {meta.grid.j})</dd>
                    </>
                )}
                {meta?.gridCell && !meta?.grid && (
                    <>
                        <dt className="text-muted-foreground">Cell</dt>
                        <dd className="font-medium tabular-nums text-right">({meta.gridCell.gx}, {meta.gridCell.gy})</dd>
                    </>
                )}
                {detailRows.map((row) => (
                    <Fragment key={row.label}>
                        <dt className="text-muted-foreground whitespace-nowrap">{row.label}</dt>
                        <dd className="font-medium tabular-nums text-right">{row.value}</dd>
                    </Fragment>
                ))}
            </dl>

            {!readonly && (
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/70 transition-colors"
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

    // Active group derived from selected feature
    const activeGroupKey = selectedFeature ? getFeatureGroupKey(selectedFeature) : null;

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
                groups={groups}
                selectedFeatureId={selectedFeatureId}
                setSelectedFeatureId={setSelectedFeatureId}
            />

            {/* Group selector pills */}
            {groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {groups.map((group) => {
                        const isActive = group.key === activeGroupKey;
                        const isVisible = isFeatureGroupVisible(group.key, featureGroupVisibility);
                        return (
                            <div
                                key={group.key}
                                className={`inline-flex items-center rounded-full border text-[11px] transition-colors ${
                                    isActive
                                        ? "border-primary/40 bg-primary/8 text-primary"
                                        : isVisible
                                            ? "border-border bg-background text-foreground"
                                            : "border-border/50 bg-muted/20 text-muted-foreground/60"
                                }`}
                            >
                                {/* Main clickable area — selects group */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedFeatureId(group.features[0].id)}
                                    className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 hover:opacity-80 transition-opacity"
                                >
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: group.color, opacity: isVisible ? 1 : 0.4 }}
                                    />
                                    <span className="font-medium">{group.label}</span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                        {group.features.length}
                                    </span>
                                </button>
                                {/* Visibility toggle */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFeatureGroupVisibility(group.key, !isVisible);
                                    }}
                                    className="pr-2 pl-0.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
                                    title={isVisible ? `Hide ${group.label}` : `Show ${group.label}`}
                                >
                                    {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                                </button>
                            </div>
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
