import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorStore, type OverlayToggles, type PanelMode } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { DensityProvider, Panel, SegmentedControl, ToggleChip } from "@vitavision/ui";
import { getLoadedAlgorithm } from "../algorithms/registry";

import ConfigurePanel from "./ConfigurePanel";
import FeatureListPanel from "./FeatureListPanel";
import ResultsPanel from "./ResultsPanel";

const MODES: { key: PanelMode; label: string }[] = [
    { key: "configure", label: "Configure" },
    { key: "results", label: "Results" },
];

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
type TouchPanelTab = PanelMode | "features";

/** A segmented strip that fills its row, one equal segment per option. */
const FULL_WIDTH_SEGMENTS = "flex w-full [&>label]:flex-1 [&>label]:text-center";

function ModeToggle({ value, onChange }: { value: PanelMode; onChange: (m: PanelMode) => void }) {
    return (
        <SegmentedControl
            aria-label="Panel"
            value={value}
            options={MODES.map(({ key, label }) => ({ value: key, label }))}
            onValueChange={(next) => {
                const mode = MODES.find(({ key }) => key === next);
                if (mode) onChange(mode.key);
            }}
            className={FULL_WIDTH_SEGMENTS}
        />
    );
}

/* ── overlay toggle controls ─────────────────────────────────── */

const TOGGLE_ITEMS: { key: keyof OverlayToggles; label: string }[] = [
    { key: "edges", label: "Grid edges" },
    { key: "labels", label: "Labels" },
];

function OverlayTogglePanel() {
    const { overlayToggles, setOverlayToggle } = useEditorStore(useShallow((s) => ({
        overlayToggles: s.overlayToggles,
        setOverlayToggle: s.setOverlayToggle,
    })));

    return (
        <div className="flex flex-wrap gap-1.5">
            {TOGGLE_ITEMS.map(({ key, label }) => (
                <ToggleChip
                    key={key}
                    checked={overlayToggles[key]}
                    onCheckedChange={(checked) => setOverlayToggle(key, checked)}
                >
                    {label}
                </ToggleChip>
            ))}
        </div>
    );
}

/* ── main panel ──────────────────────────────────────────────── */

export default function EditorRightPanel({ variant = "desktop" }: { variant?: "desktop" | "touch" }) {
    const { panelMode, setPanelMode, lastAlgorithmResult } = useEditorStore(useShallow((s) => ({
        panelMode: s.panelMode,
        setPanelMode: s.setPanelMode,
        lastAlgorithmResult: s.lastAlgorithmResult,
    })));
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const isDragging = useRef(false);
    const [touchTabOverride, setTouchTabOverride] = useState<"features" | null>(null);
    const touchTab: TouchPanelTab = touchTabOverride ?? panelMode;

    // By the time lastAlgorithmResult is set, the algorithm is already loaded.
    const hasOverlay = lastAlgorithmResult
        ? !!(getLoadedAlgorithm(lastAlgorithmResult.algorithmId)?.OverlayComponent)
        : false;

    // AbortController used to clean up drag listeners if the component unmounts mid-drag.
    const dragAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            // Abort any in-progress drag on unmount.
            dragAbortRef.current?.abort();
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDragging.current = true;
        const handle = e.currentTarget;
        handle.setPointerCapture(e.pointerId);

        // Abort any previous drag (shouldn't happen, but be safe).
        dragAbortRef.current?.abort();
        const controller = new AbortController();
        dragAbortRef.current = controller;

        const onMove = (ev: PointerEvent) => {
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX));
            setWidth(newWidth);
        };
        const onUp = () => {
            isDragging.current = false;
            controller.abort();
            dragAbortRef.current = null;
        };
        handle.addEventListener("pointermove", onMove, { signal: controller.signal });
        handle.addEventListener("pointerup", onUp, { signal: controller.signal });
    }, []);

    if (variant === "touch") {
        const tabs: { key: TouchPanelTab; label: string }[] = [
            { key: "configure", label: "Configure" },
            { key: "results", label: "Results" },
            { key: "features", label: "Features" },
        ];

        return (
            // Touch keeps ui's comfortable density: its controls are finger-sized.
            <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                    <SegmentedControl
                        aria-label="Panel"
                        value={touchTab}
                        options={tabs.map(({ key, label }) => ({ value: key, label }))}
                        onValueChange={(next) => {
                            if (next === "features") {
                                setTouchTabOverride("features");
                            } else if (next === "configure" || next === "results") {
                                setTouchTabOverride(null);
                                setPanelMode(next);
                            }
                        }}
                        className={FULL_WIDTH_SEGMENTS}
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-4">
                        {touchTab === "configure" && <ConfigurePanel />}
                        {touchTab === "results" && <ResultsPanel />}
                        {touchTab === "features" && (
                            <>
                                {hasOverlay && (
                                    <Panel title="Overlay">
                                        <OverlayTogglePanel />
                                    </Panel>
                                )}
                                <Panel title="Features">
                                    <FeatureListPanel />
                                </Panel>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="border-l border-line bg-ground shrink-0 flex h-full overflow-hidden relative"
            style={{ width }}
        >
            {/* resize handle */}
            <div
                onPointerDown={handlePointerDown}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group"
            >
                <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-signal/20 group-active:bg-signal/30 transition-colors" />
            </div>

            <DensityProvider value="compact">
            <div className="flex flex-col h-full w-full p-4 pl-3">
                <div className="mb-4 shrink-0">
                    <ModeToggle value={panelMode} onChange={setPanelMode} />
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
                    {panelMode === "configure" && <ConfigurePanel />}
                    {panelMode === "results" && <ResultsPanel />}

                    {hasOverlay && (
                        <Panel title="Overlay">
                            <OverlayTogglePanel />
                        </Panel>
                    )}

                    <Panel title="Features">
                        <FeatureListPanel />
                    </Panel>
                </div>
            </div>
            </DensityProvider>
        </div>
    );
}
