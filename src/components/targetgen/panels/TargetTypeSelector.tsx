import { useRef } from "react";
import { toast } from "sonner";
import { Grid3X3, QrCode, CircleDot, Target, Puzzle, Upload } from "lucide-react";
import type { TargetType, TargetGeneratorAction, TargetConfig, PageConfig } from "../types";
import { presetsForType } from "../presets";
import { Button, cn, Select } from "@vitavision/ui";

/** Shape of a config file previously exported via `exportFeaturesAsJson`-style
 *  JSON download. `page` may be missing the fields added after older exports
 *  were written (`pngDpi`, `showScaleLine`), which are defaulted below. */
interface ImportedTargetConfig {
    target?: TargetConfig;
    page?: Partial<PageConfig>;
}

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
                const data = JSON.parse(ev.target?.result as string) as ImportedTargetConfig;
                if (data.target?.targetType && data.target.config && data.page) {
                    // Ensure new fields exist for configs from older versions
                    const page = { pngDpi: 300, showScaleLine: true, ...data.page } as PageConfig;
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
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted px-1">
                Target Type
            </h2>
            <div className={layout === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
                {TARGET_TYPES.map((t) => (
                    <Button
                        key={t.id}
                        variant="secondary"
                        aria-pressed={selected === t.id}
                        onClick={() =>
                            dispatch({ type: "SET_TARGET_TYPE", targetType: t.id })
                        }
                        className={cn(
                            "h-auto min-h-[7.25rem] flex-col gap-1.5 whitespace-normal p-3 text-center",
                            selected === t.id ? "bg-signal/5 ring-signal" : "text-fg-muted",
                        )}
                    >
                        <span
                            className={
                                selected === t.id
                                    ? "text-signal"
                                    : "text-fg-muted"
                            }
                        >
                            {t.icon}
                        </span>
                        <span className="text-xs font-medium">{t.label}</span>
                        <span className="text-[10px] leading-tight text-fg-muted">
                            {t.description}
                        </span>
                    </Button>
                ))}
            </div>

            {showPresets && (
                <div className="mt-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted px-1 mb-1.5">
                        Presets
                    </h2>
                    {/* Always unset: choosing a preset loads it, and the picker is ready for the next. */}
                    <Select
                        aria-label="Presets"
                        value=""
                        placeholder="Choose a preset…"
                        options={presets.map((p) => ({ value: p.id, label: p.label }))}
                        onValueChange={(id) => {
                            const preset = presets.find((p) => p.id === id);
                            if (preset) {
                                dispatch({
                                    type: "LOAD_PRESET",
                                    target: preset.target,
                                    page: preset.page,
                                });
                            }
                        }}
                    />
                    <p className="text-[10px] text-fg-muted mt-1 px-1">
                        Select a preset to auto-fill config
                    </p>
                </div>
            )}

            {/* Import config */}
            <Button
                size="sm"
                className="mt-1"
                onClick={() => fileRef.current?.click()}
                icon={<Upload />}
            >
                Import Config
            </Button>
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
