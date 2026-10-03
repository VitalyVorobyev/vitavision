import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Lock, Trash2, Upload } from "lucide-react";
import { Button, cn } from "@vitavision/ui";

import { exportFeaturesAsJson, promptFeatureImport } from "../featureIo";
import {
    buildFeatureGroups,
    getFeatureGroupKey,
    isFeatureGroupVisible,
    type FeatureGroup,
} from "../../../store/editor/featureGroups";
import { isReadonlyFeature, useEditorStore, type Feature, type FeatureMeta } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { useFeatureNav } from "../hooks/useFeatureNav";
import { fmtCoord, fmtScore } from "./formatNumber";

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
        meta.offsetCells !== undefined && meta.offsetCells !== null
            ? { label: "Offset", value: `di=${meta.offsetCells.di}, dj=${meta.offsetCells.dj}` }
            : null,
    ];
    return rows.filter((r): r is MetaRow => r !== null);
}

/** Extract (x, y) from any spatial feature. */
function featureXY(feature: Feature): { x: number; y: number } | null {
    if (feature.type === "point" || feature.type === "directed_point" || feature.type === "labeled_point") {
        return { x: feature.x, y: feature.y };
    }
    if (feature.type === "bbox" || feature.type === "ellipse" || feature.type === "ring_marker" || feature.type === "aruco_marker") {
        return { x: feature.x, y: feature.y };
    }
    if (feature.type === "line") {
        return { x: feature.points[0], y: feature.points[1] };
    }
    if (feature.type === "polyline" && feature.points.length >= 2) {
        // Length checked just above, so indices 0 and 1 are in bounds.
        return { x: feature.points[0]!, y: feature.points[1]! };
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
    const { activeGroupIndex, group, total, goPrev, goNext, position } = useFeatureNav(groups, selectedFeatureId, setSelectedFeatureId);

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

    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-focus navigator when the active group changes so arrow keys work immediately
    useEffect(() => {
        if (activeGroupIndex >= 0) {
            containerRef.current?.focus();
        }
    }, [activeGroupIndex]);

    if (total === 0) return null;

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="flex items-center justify-center gap-3 rounded-control py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
            <Button
                variant="ghost"
                className="px-1.5"
                onClick={goPrev}
                disabled={total === 0}
                aria-label="Previous feature"
                icon={<ChevronLeft />}
            />
            <span className="text-xs text-fg font-medium text-center">
                {group && (
                    <span className="text-fg-muted">{group.label} </span>
                )}
                <span className="tabular-nums">{position}</span>
            </span>
            <Button
                variant="ghost"
                className="px-1.5"
                onClick={goNext}
                disabled={total === 0}
                aria-label="Next feature"
                icon={<ChevronRight />}
            />
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

    // Resolve score from meta or features that carry it directly.
    const score = meta?.score
        ?? (feature.type === "directed_point" ? feature.score : null)
        ?? (feature.type === "labeled_point" ? feature.score : null);
    const detailRows = meta ? buildDetailMeta(meta) : [];

    // labeled_point (puzzleboard / charuco corners) carries its grid + target-board
    // info directly on the feature, not inside meta — surface it here.
    const labeledPointInfo = feature.type === "labeled_point"
        ? {
            gridIndex: feature.gridIndex,
            masterId: feature.masterId,
            targetPosMm: feature.targetPosMm,
        }
        : null;

    return (
        <div className="rounded-panel border border-signal/30 bg-signal/6 px-4 py-3 space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-signal">
                    Selected
                </span>
                <div className="flex items-center gap-1.5">
                    {hidden && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-raised text-fg-muted">
                            <EyeOff size={9} /> hidden
                        </span>
                    )}
                    {readonly && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-raised text-fg-muted">
                            <Lock size={9} /> read-only
                        </span>
                    )}
                </div>
            </div>

            {/* Tabular key-value layout */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {xy && (
                    <>
                        <dt className="text-fg-muted whitespace-nowrap">Position</dt>
                        <dd className="font-medium tabular-nums text-right">
                            {fmtCoord(xy.x)}, {fmtCoord(xy.y)}
                        </dd>
                    </>
                )}
                {score !== null && (
                    <>
                        <dt className="text-fg-muted">Score</dt>
                        <dd className="font-medium tabular-nums text-right">{fmtScore(score)}</dd>
                    </>
                )}
                {meta?.grid && (
                    <>
                        <dt className="text-fg-muted">Grid</dt>
                        <dd className="font-medium tabular-nums text-right">({meta.grid.i}, {meta.grid.j})</dd>
                    </>
                )}
                {meta?.gridCell && !meta?.grid && (
                    <>
                        <dt className="text-fg-muted">Cell</dt>
                        <dd className="font-medium tabular-nums text-right">({meta.gridCell.gx}, {meta.gridCell.gy})</dd>
                    </>
                )}
                {labeledPointInfo && (
                    <>
                        <dt className="text-fg-muted whitespace-nowrap">Master idx</dt>
                        <dd className="font-medium tabular-nums text-right">
                            ({labeledPointInfo.gridIndex.i}, {labeledPointInfo.gridIndex.j})
                        </dd>
                        <dt className="text-fg-muted whitespace-nowrap">Master ID</dt>
                        <dd className="font-medium tabular-nums text-right">{labeledPointInfo.masterId}</dd>
                        {labeledPointInfo.targetPosMm && (
                            <>
                                <dt className="text-fg-muted whitespace-nowrap">Target (mm)</dt>
                                <dd className="font-medium tabular-nums text-right">
                                    {fmtCoord(labeledPointInfo.targetPosMm.x)}, {fmtCoord(labeledPointInfo.targetPosMm.y)}
                                </dd>
                            </>
                        )}
                    </>
                )}
                {detailRows.map((row) => (
                    <Fragment key={row.label}>
                        <dt className="text-fg-muted whitespace-nowrap">{row.label}</dt>
                        <dd className="font-medium tabular-nums text-right">{row.value}</dd>
                    </Fragment>
                ))}
            </dl>

            {!readonly && (
                <Button variant="danger" onClick={onDelete} icon={<Trash2 />}>
                    Delete
                </Button>
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
                <Button title="Import feature JSON" onClick={handleImport} icon={<Upload />}>
                    Import
                </Button>
                <Button
                    title="Export current features"
                    onClick={handleExport}
                    disabled={features.length === 0}
                    icon={<Download />}
                >
                    Export
                </Button>
                <Button
                    variant="danger"
                    title="Clear all features"
                    onClick={handleClear}
                    disabled={features.length === 0}
                    icon={<Trash2 />}
                >
                    Clear
                </Button>
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
                        const firstFeatureId = group.features[0]?.id;
                        return (
                            <div key={group.key} className="inline-flex items-center">
                                {/* Selects the group: the navigator then steps through it. */}
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    aria-pressed={isActive}
                                    className={cn("gap-1.5 px-2", !isVisible && "text-fg-subtle")}
                                    onClick={() => {
                                        if (firstFeatureId !== undefined) setSelectedFeatureId(firstFeatureId);
                                    }}
                                >
                                    <span
                                        aria-hidden
                                        className="size-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: group.color, opacity: isVisible ? 1 : 0.4 }}
                                    />
                                    <span>{group.label}</span>
                                    <span className="font-mono text-[10px] text-fg-muted tabular-nums">
                                        {group.features.length}
                                    </span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="px-1.5"
                                    aria-label={isVisible ? `Hide ${group.label}` : `Show ${group.label}`}
                                    title={isVisible ? `Hide ${group.label}` : `Show ${group.label}`}
                                    onClick={() => setFeatureGroupVisibility(group.key, !isVisible)}
                                    icon={isVisible ? <Eye /> : <EyeOff />}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {features.length === 0 && (
                <div className="rounded-panel border border-dashed border-line py-6 text-center">
                    <p className="text-xs text-fg-muted">No features yet</p>
                </div>
            )}
        </div>
    );
}
