import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorStore, type OverlayToggles, type PanelMode } from "../../../store/editor/useEditorStore";
import { useShallow } from "zustand/react/shallow";
import { getLoadedAlgorithm } from "../algorithms/registry";

import ConfigurePanel from "./ConfigurePanel";
import FeatureListPanel from "./FeatureListPanel";
import RailSection from "./RailSection";
import ResultsPanel from "./ResultsPanel";

const MODES: { key: PanelMode; label: string }[] = [
    { key: "configure", label: "Configure" },
    { key: "results", label: "Results" },
];

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
type TouchPanelTab = PanelMode | "features";

function ModeToggle({ value, onChange }: { value: PanelMode; onChange: (m: PanelMode) => void }) {
    return (
        <div className="flex rounded-lg border border-border overflow-hidden">
            {MODES.map(({ key, label }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
                        value === key
                            ? "bg-primary/10 text-primary"
                            : "bg-background text-muted-foreground hover:bg-muted/60"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
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
                <button
                    key={key}
                    type="button"
                    onClick={() => setOverlayToggle(key, !overlayToggles[key])}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        overlayToggles[key]
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                >
                    {label}
                </button>
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
            <div className="flex h-full flex-col overflow-hidden bg-muted/10">
                <div className="border-b border-border px-4 py-3">
                    <div className="grid grid-cols-3 gap-2">
                        {tabs.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    if (key === "features") {
                                        setTouchTabOverride("features");
                                    } else {
                                        setTouchTabOverride(null);
                                        setPanelMode(key);
                                    }
                                }}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    touchTab === key
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "border border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-5">
                        {touchTab === "configure" && <ConfigurePanel />}
                        {touchTab === "results" && <ResultsPanel />}
                        {touchTab === "features" && (
                            <>
                                {hasOverlay && (
                                    <RailSection label="Overlay">
                                        <OverlayTogglePanel />
                                    </RailSection>
                                )}
                                <RailSection label="Features">
                                    <FeatureListPanel />
                                </RailSection>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="border-l border-border bg-muted/20 shrink-0 flex h-full overflow-hidden relative"
            style={{ width }}
        >
            {/* resize handle */}
            <div
                onPointerDown={handlePointerDown}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group"
            >
                <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-primary/20 group-active:bg-primary/30 transition-colors" />
            </div>

            <div className="flex flex-col h-full w-full p-4 pl-3">
                <div className="mb-4 shrink-0">
                    <ModeToggle value={panelMode} onChange={setPanelMode} />
                </div>
                <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">
                    {panelMode === "configure" && <ConfigurePanel />}
                    {panelMode === "results" && <ResultsPanel />}

                    {hasOverlay && (
                        <RailSection label="Overlay">
                            <OverlayTogglePanel />
                        </RailSection>
                    )}

                    <RailSection label="Features">
                        <FeatureListPanel />
                    </RailSection>
                </div>
            </div>
        </div>
    );
}
