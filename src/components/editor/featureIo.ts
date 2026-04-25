import { toast } from "sonner";
import { featuresArraySchema } from "../../store/editor/featureSchema";
import { normalizeImportedFeatures, type Feature } from "../../store/editor/useEditorStore";

/** Internal fields stripped from JSON export. */
const INTERNAL_KEYS = new Set(["id", "runId", "algorithmId", "source", "readonly"]);

/** Meta fields to keep in export (rendering-relevant only). */
const EXPORT_META_KEYS = new Set(["grid", "polarity"]);

function stripForExport(feature: Feature): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(feature)) {
        if (INTERNAL_KEYS.has(key)) continue;
        if (key === "meta" && value && typeof value === "object") {
            const meta: Record<string, unknown> = {};
            for (const [mk, mv] of Object.entries(value as Record<string, unknown>)) {
                if (EXPORT_META_KEYS.has(mk) && mv !== undefined && mv !== null) {
                    meta[mk] = mv;
                }
            }
            if (Object.keys(meta).length > 0) {
                out.meta = meta;
            }
            continue;
        }
        if (value !== undefined) {
            out[key] = value;
        }
    }
    return out;
}

// Migrate features exported before chess-corners v0.6 changed directed_point
// from a single `direction` to a two-axis `axes` tuple. Synthesizes the second
// axis as the perpendicular of the first.
function migrateLegacyFeatures(parsed: unknown): unknown {
    if (!Array.isArray(parsed)) return parsed;
    return parsed.map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const f = entry as Record<string, unknown>;
        if (f.type !== "directed_point" || f.axes !== undefined) return entry;
        const direction = f.direction as { dx?: unknown; dy?: unknown } | undefined;
        if (!direction || typeof direction.dx !== "number" || typeof direction.dy !== "number") {
            return entry;
        }
        const { dx, dy } = direction;
        const orientationRad = typeof f.orientationRad === "number" ? f.orientationRad : undefined;
        const { direction: _direction, orientationRad: _orientationRad, ...rest } = f;
        return {
            ...rest,
            axes: [
                { dx, dy, ...(orientationRad !== undefined ? { angleRad: orientationRad } : {}) },
                { dx: -dy, dy: dx },
            ],
        };
    });
}

export function exportFeaturesAsJson(features: Feature[]) {
    const exported = features.map(stripForExport);
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exported, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "vitavision_features.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export function promptFeatureImport({
    currentFeatureCount,
    onLoaded,
}: {
    currentFeatureCount: number;
    onLoaded: (features: Feature[]) => void;
}) {
    if (
        currentFeatureCount > 0
        && !window.confirm("Replace the current features with a JSON import? This will clear the current results view.")
    ) {
        return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            try {
                const parsed = JSON.parse((readerEvent.target?.result as string) || "null");
                const migrated = migrateLegacyFeatures(parsed);
                const result = featuresArraySchema.safeParse(migrated);
                if (!result.success) {
                    toast.error(`Invalid feature file: ${result.error.issues[0]?.message ?? "unknown error"}`);
                    return;
                }

                onLoaded(normalizeImportedFeatures(result.data));
            } catch {
                toast.error("Failed to parse JSON.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
