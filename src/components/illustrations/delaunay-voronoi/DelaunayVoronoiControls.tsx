import { useEffect, useRef, useState } from "react";
import { classNames } from "../../../utils/helpers";
import type { DelaunayVoronoiState } from "./useDelaunayVoronoi";
import type { Layers } from "./types";

function NumberInput({
    value,
    onChange,
    min,
    max,
}: {
    value: number;
    onChange: (next: number) => void;
    min: number;
    max: number;
}) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            if (document.activeElement !== el) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1 : -1;
            const next = Math.max(min, Math.min(max, value + delta));
            if (next !== value) onChange(next);
        };
        el.addEventListener("wheel", handler, { passive: false });
        return () => el.removeEventListener("wheel", handler);
    }, [value, onChange, min, max]);
    return (
        <input
            ref={ref}
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
                const v = Math.max(min, Math.min(max, Number(e.target.value)));
                if (Number.isFinite(v)) onChange(v);
            }}
            className="w-16 rounded-lg border border-border/80 bg-background px-2 py-1 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
    );
}

function ToggleButton({
    label,
    pressed,
    onChange,
}: {
    label: string;
    pressed: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(!pressed)}
            className={classNames(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors text-left w-full",
                pressed
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
            )}
        >
            {label}
        </button>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
            {children}
        </div>
    );
}

interface Props {
    demo: DelaunayVoronoiState;
}

const LAYER_LABELS: { key: keyof Layers; label: string }[] = [
    { key: "delaunay", label: "Delaunay edges" },
    { key: "voronoi", label: "Voronoi cells" },
    { key: "circumcircles", label: "Circumcircles" },
];

export default function DelaunayVoronoiControls({ demo }: Props) {
    const { state, toggleLayer, setGridDims, resetGrid, clearPoints, randomPoints } = demo;
    const { layers, grid } = state;
    const [randomCount, setRandomCount] = useState(30);

    return (
        <div className="space-y-5">
            {/* Layers */}
            <div className="space-y-2.5">
                <SectionLabel>Layers</SectionLabel>
                <div className="space-y-1.5">
                    {LAYER_LABELS.map(({ key, label }) => (
                        <ToggleButton
                            key={key}
                            label={label}
                            pressed={layers[key]}
                            onChange={() => toggleLayer(key)}
                        />
                    ))}
                </div>
            </div>

            {/* Projective grid */}
            <div className="space-y-2.5">
                <SectionLabel>Projective grid</SectionLabel>
                <ToggleButton
                    label="Show grid"
                    pressed={layers.grid}
                    onChange={() => toggleLayer("grid")}
                />
                {layers.grid && (
                    <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/25 px-3 py-3">
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-foreground/80">Rows</span>
                            <NumberInput
                                value={grid.rows}
                                min={2}
                                max={20}
                                onChange={(v) => setGridDims(v, undefined)}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-foreground/80">Cols</span>
                            <NumberInput
                                value={grid.cols}
                                min={2}
                                max={20}
                                onChange={(v) => setGridDims(undefined, v)}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={resetGrid}
                            className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Reset corners
                        </button>
                    </div>
                )}
            </div>

            {/* Points */}
            <div className="space-y-2.5">
                <SectionLabel>Points</SectionLabel>
                <div className="space-y-1.5">
                    <div className="flex items-stretch gap-1.5">
                        <NumberInput
                            value={randomCount}
                            min={3}
                            max={500}
                            onChange={setRandomCount}
                        />
                        <button
                            type="button"
                            onClick={() => randomPoints(randomCount)}
                            className="flex-1 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Random points
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={clearPoints}
                        className="w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                        Clear all
                    </button>
                </div>
            </div>
        </div>
    );
}
