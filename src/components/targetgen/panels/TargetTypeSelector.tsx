import { useRef } from "react";
import { toast } from "sonner";
import { Grid3X3, QrCode, CircleDot, Target, Puzzle, Upload } from "lucide-react";
import type { TargetType, TargetGeneratorAction } from "../types";
import { presetsForType } from "../presets";

const TARGET_TYPES: {
    id: TargetType;
    label: string;
    description: string;
    icon: React.ReactNode;
}[] = [
    {
        id: "chessboard",
        label: "Chessboard",
        description: "Classic checkerboard pattern for camera calibration",
        icon: <Grid3X3 size={24} />,
    },
    {
        id: "charuco",
        label: "ChArUco",
        description: "Checkerboard with embedded ArUco markers",
        icon: <QrCode size={24} />,
    },
    {
        id: "markerboard",
        label: "Marker Board",
        description: "Checkerboard with asymmetric circle markers",
        icon: <CircleDot size={24} />,
    },
    {
        id: "ringgrid",
        label: "Ring Grid",
        description: "Hex-lattice concentric ring markers with binary code bands",
        icon: <Target size={24} />,
    },
    {
        id: "puzzleboard",
        label: "PuzzleBoard",
        description: "Self-identifying checkerboard with embedded edge-bit position code.",
        icon: <Puzzle size={24} />,
    },
];

interface Props {
    selected: TargetType;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    showPresets?: boolean;
    layout?: "stack" | "grid";
}

export default function TargetTypeSelector({
    selected,
    dispatch,
    showPresets = true,
    layout = "stack",
}: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const presets = presetsForType(selected);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data?.target?.targetType && data?.target?.config && data?.page) {
                    // Ensure new fields exist for configs from older versions
                    const page = { pngDpi: 300, showScaleLine: true, ...data.page };
                    dispatch({
                        type: "LOAD_PRESET",
                        target: data.target,
                        page,
                    });
                } else {
                    toast.error("Invalid config file: missing target or page fields.");
                }
            } catch {
                toast.error("Failed to parse JSON config file.");
            }
        };
        reader.readAsText(file);
        // Reset so re-importing the same file works
        e.target.value = "";
    };

    return (
        <div className="flex flex-col gap-2 p-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 px-1">
                Target Type
            </h2>
            <div className={layout === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
                {TARGET_TYPES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() =>
                            dispatch({ type: "SET_TARGET_TYPE", targetType: t.id })
                        }
                        className={`flex min-h-[7.25rem] flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                            selected === t.id
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border bg-background hover:border-muted-foreground/40 text-muted-foreground"
                        }`}
                    >
                        <span
                            className={
                                selected === t.id
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            }
                        >
                            {t.icon}
                        </span>
                        <span className="text-xs font-medium">{t.label}</span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                            {t.description}
                        </span>
                    </button>
                ))}
            </div>

            {showPresets && (
                <div className="mt-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 px-1 mb-1.5">
                        Presets
                    </h2>
                    <select
                        value=""
                        onChange={(e) => {
                            const preset = presets.find((p) => p.id === e.target.value);
                            if (preset) {
                                dispatch({
                                    type: "LOAD_PRESET",
                                    target: preset.target,
                                    page: preset.page,
                                });
                            }
                        }}
                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    >
                        <option value="" disabled>
                            Choose a preset...
                        </option>
                        {presets.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 px-1">
                        Select a preset to auto-fill config
                    </p>
                </div>
            )}

            {/* Import config */}
            <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-muted-foreground/40 hover:bg-muted mt-1"
            >
                <Upload size={14} />
                Import Config
            </button>
            <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImport}
            />
        </div>
    );
}
