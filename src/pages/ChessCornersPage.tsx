import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, LoaderCircle, Sparkles, Upload } from "lucide-react";

import { createUploadTicket, uploadWithTicket, type StorageMode } from "../lib/storage";
import { detectChessCorners, type ChessCornerFeature, type ChessCornersResult } from "../lib/api";

type RequestedStorageMode = "auto" | StorageMode;
type RunStage = "idle" | "requesting-ticket" | "uploading" | "detecting";

const ARROW_LENGTH_PX = 20;

function bytesToLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function stageLabel(stage: RunStage): string {
    if (stage === "requesting-ticket") return "Requesting upload ticket...";
    if (stage === "uploading") return "Uploading image to storage...";
    if (stage === "detecting") return "Running chess corner detection...";
    return "Idle";
}

function confidenceColor(level: ChessCornerFeature["confidence_level"], selected: boolean): string {
    if (selected) return "#f97316";
    if (level === "high") return "#22c55e";
    if (level === "medium") return "#f59e0b";
    return "#ef4444";
}

function confidenceBadge(level: ChessCornerFeature["confidence_level"]): string {
    if (level === "high") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    if (level === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

export default function ChessCornersPage() {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [storageMode, setStorageMode] = useState<RequestedStorageMode>("auto");
    const [useMlRefiner, setUseMlRefiner] = useState(false);
    const [thresholdRel, setThresholdRel] = useState(0.2);

    const [runStage, setRunStage] = useState<RunStage>("idle");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ChessCornersResult | null>(null);
    const [selectedCornerId, setSelectedCornerId] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    useEffect(() => {
        if (!result || result.corners.length === 0) {
            setSelectedCornerId(null);
            return;
        }
        setSelectedCornerId(result.corners[0].id);
    }, [result]);

    const selectedCorner = useMemo(() => {
        if (!result || !selectedCornerId) return null;
        return result.corners.find((corner) => corner.id === selectedCornerId) ?? null;
    }, [result, selectedCornerId]);

    const averageConfidence = useMemo(() => {
        if (!result || result.corners.length === 0) return 0;
        const sum = result.corners.reduce((acc, corner) => acc + corner.confidence, 0);
        return sum / result.corners.length;
    }, [result]);

    const isBusy = runStage !== "idle";

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const picked = event.target.files?.[0] ?? null;
        setFile(picked);
        setResult(null);
        setError(null);
    };

    const runPipeline = async () => {
        if (!file) return;

        try {
            setError(null);
            setRunStage("requesting-ticket");

            const uploadTicket = await createUploadTicket({
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                storageMode: storageMode === "auto" ? undefined : storageMode,
            });

            setRunStage("uploading");
            await uploadWithTicket(file, uploadTicket);

            setRunStage("detecting");
            const nextResult = await detectChessCorners({
                key: uploadTicket.key,
                storageMode: uploadTicket.storage_mode,
                useMlRefiner,
                config: { thresholdRel },
            });
            setResult(nextResult);
        } catch (rawError) {
            const message = rawError instanceof Error ? rawError.message : "Unknown pipeline error";
            setError(message);
        } finally {
            setRunStage("idle");
        }
    };

    return (
        <div className="px-4 py-6 md:px-8 md:py-8 space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Chess Corners Detection Prototype</h1>
                <p className="text-muted-foreground max-w-3xl">
                    Upload an image, stream it to R2 (or local fallback), then run backend detection by storage key. Results show subpixel coordinates, orientation vectors, and confidence levels.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
                <section className="rounded-xl border border-border bg-background p-4 md:p-5 space-y-4 h-fit">
                    <div className="space-y-2">
                        <h2 className="font-semibold">Pipeline Controls</h2>
                        <p className="text-xs text-muted-foreground">
                            Storage mode selects where the upload goes before backend fetches by key.
                        </p>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                        <Upload size={16} />
                        Select Image
                    </button>

                    <div className="rounded-md border border-border/80 p-3 text-sm space-y-1">
                        <div className="font-medium">{file ? file.name : "No file selected"}</div>
                        <div className="text-xs text-muted-foreground">{file ? bytesToLabel(file.size) : "Pick PNG/JPG input"}</div>
                    </div>

                    <label className="grid gap-1 text-sm">
                        <span className="text-muted-foreground">Storage mode</span>
                        <select
                            value={storageMode}
                            onChange={(e) => setStorageMode(e.target.value as RequestedStorageMode)}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        >
                            <option value="auto">Auto (prefer R2)</option>
                            <option value="r2">R2 only</option>
                            <option value="local">Local dev storage</option>
                        </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                        <span className="text-muted-foreground">Threshold (relative): {thresholdRel.toFixed(2)}</span>
                        <input
                            type="range"
                            min={0.05}
                            max={0.8}
                            step={0.01}
                            value={thresholdRel}
                            onChange={(e) => setThresholdRel(Number(e.target.value))}
                        />
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useMlRefiner}
                            onChange={(e) => setUseMlRefiner(e.target.checked)}
                        />
                        <span>Use ML refiner</span>
                    </label>

                    <button
                        type="button"
                        onClick={runPipeline}
                        disabled={!file || isBusy}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Upload + Detect
                    </button>

                    <div className="text-xs text-muted-foreground">
                        Status: <span className="font-medium">{stageLabel(runStage)}</span>
                    </div>
                    {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
                </section>

                <section className="rounded-xl border border-border bg-background p-3 md:p-4 min-h-[420px]">
                    {!previewUrl ? (
                        <div className="h-full min-h-[380px] rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                            Select an image to preview and detect corners
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Compass size={14} />
                                Frame: image pixel centers, origin top-left, x right, y down
                            </div>
                            <div className="relative inline-block max-w-full">
                                <img
                                    src={previewUrl}
                                    alt="Uploaded source"
                                    className="max-h-[70vh] w-auto max-w-full rounded-md border border-border shadow-sm"
                                />
                                {result && result.corners.length > 0 && (
                                    <svg
                                        className="absolute inset-0 h-full w-full pointer-events-auto"
                                        viewBox={`0 0 ${result.image_width} ${result.image_height}`}
                                        preserveAspectRatio="none"
                                    >
                                        {result.corners.map((corner) => {
                                            const selected = corner.id === selectedCornerId;
                                            const color = confidenceColor(corner.confidence_level, selected);
                                            const arrowX = corner.x + corner.direction.dx * ARROW_LENGTH_PX;
                                            const arrowY = corner.y + corner.direction.dy * ARROW_LENGTH_PX;
                                            return (
                                                <g key={corner.id}>
                                                    <line
                                                        x1={corner.x}
                                                        y1={corner.y}
                                                        x2={arrowX}
                                                        y2={arrowY}
                                                        stroke={color}
                                                        strokeWidth={selected ? 2.4 : 1.4}
                                                        opacity={selected ? 1 : 0.85}
                                                        pointerEvents="none"
                                                    />
                                                    <circle
                                                        cx={arrowX}
                                                        cy={arrowY}
                                                        r={selected ? 2.6 : 1.8}
                                                        fill={color}
                                                        pointerEvents="none"
                                                    />
                                                    <circle
                                                        cx={corner.x}
                                                        cy={corner.y}
                                                        r={selected ? 4.5 : 3.2}
                                                        fill={color}
                                                        opacity={selected ? 0.95 : 0.8}
                                                        className="cursor-pointer"
                                                        pointerEvents="all"
                                                        onClick={() => setSelectedCornerId(corner.id)}
                                                    />
                                                </g>
                                            );
                                        })}
                                    </svg>
                                )}
                            </div>
                            {!result && (
                                <div className="text-sm text-muted-foreground">
                                    Run pipeline to overlay detections.
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-border bg-background p-4 md:p-5 flex flex-col gap-4 min-h-[420px]">
                    <h2 className="font-semibold">Detected Features</h2>

                    {!result ? (
                        <p className="text-sm text-muted-foreground">No detection results yet.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-md border border-border/80 p-2">
                                    <div className="text-muted-foreground">Corners</div>
                                    <div className="text-base font-semibold">{result.summary.count}</div>
                                </div>
                                <div className="rounded-md border border-border/80 p-2">
                                    <div className="text-muted-foreground">Runtime</div>
                                    <div className="text-base font-semibold">{result.summary.runtime_ms.toFixed(2)} ms</div>
                                </div>
                                <div className="rounded-md border border-border/80 p-2">
                                    <div className="text-muted-foreground">Avg confidence</div>
                                    <div className="text-base font-semibold">{averageConfidence.toFixed(2)}</div>
                                </div>
                                <div className="rounded-md border border-border/80 p-2">
                                    <div className="text-muted-foreground">Subpixel mean</div>
                                    <div className="text-base font-semibold">
                                        {result.summary.subpixel_mean_offset_px?.toFixed(3) ?? "n/a"} px
                                    </div>
                                </div>
                            </div>

                            {selectedCorner && (
                                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                                    <div className="font-semibold">Selected Corner</div>
                                    <div>x: {selectedCorner.x.toFixed(3)} px</div>
                                    <div>y: {selectedCorner.y.toFixed(3)} px</div>
                                    <div>theta: {selectedCorner.orientation_deg.toFixed(2)} deg</div>
                                    <div>response: {selectedCorner.response.toFixed(2)}</div>
                                    <div>subpixel offset: {selectedCorner.subpixel_offset_px.toFixed(3)} px</div>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto border border-border/80 rounded-md">
                                <div className="sticky top-0 bg-background border-b border-border/80 text-[11px] uppercase tracking-wide text-muted-foreground grid grid-cols-[52px_1fr_1fr_72px] px-3 py-2">
                                    <span>ID</span>
                                    <span>X</span>
                                    <span>Y</span>
                                    <span>Conf</span>
                                </div>
                                <div className="divide-y divide-border/80">
                                    {result.corners.map((corner, idx) => {
                                        const selected = corner.id === selectedCornerId;
                                        return (
                                            <button
                                                key={corner.id}
                                                type="button"
                                                onClick={() => setSelectedCornerId(corner.id)}
                                                className={`w-full text-left grid grid-cols-[52px_1fr_1fr_72px] px-3 py-2 text-xs hover:bg-muted/60 transition-colors ${selected ? "bg-primary/10" : ""}`}
                                            >
                                                <span className="font-mono text-muted-foreground">{idx + 1}</span>
                                                <span className="font-mono">{corner.x.toFixed(3)}</span>
                                                <span className="font-mono">{corner.y.toFixed(3)}</span>
                                                <span className="flex justify-end">
                                                    <span className={`px-2 py-0.5 rounded-full ${confidenceBadge(corner.confidence_level)}`}>
                                                        {corner.confidence.toFixed(2)}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
