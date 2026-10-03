import { toast } from "@vitavision/ui";
import { featuresArraySchema } from "../../store/editor/featureSchema";
import { FEATURE_FILE_VERSION, migrateFeaturesV1 } from "../../store/editor/featureMigration";
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
    // `Array.isArray` narrows an `unknown` value to `any[]`, so route through
    // an explicitly `unknown[]`-typed binding to keep `entry` (and the
    // returns below) from silently becoming `any`.
    const entries: unknown[] = parsed;
    return entries.map((entry) => {
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

/** The exported document: the features with the file format version they are written in. */
export interface FeatureFile {
    version: typeof FEATURE_FILE_VERSION;
    features: Record<string, unknown>[];
}

export function serializeFeatures(features: Feature[]): FeatureFile {
    return { version: FEATURE_FILE_VERSION, features: features.map(stripForExport) };
}

export function exportFeaturesAsJson(features: Feature[]) {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(serializeFeatures(features), null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "vitavision_features.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export type ReadFeatureFileResult = { ok: true; features: Feature[] } | { ok: false; message: string };

/**
 * The features of a parsed feature file, in the current coordinate frame.
 *
 * A bare array, or an object without `version`, is a version 1 file: its coordinates have the
 * corner of pixel 0 at the origin, so every one is shifted by -0.5 (see `migrateFeaturesV1`).
 * `{ version: 2, features }` is read as it is. Any other version is refused rather than guessed at.
 */
export function readFeatureFile(parsed: unknown): ReadFeatureFileResult {
    let version = 1;
    let entries: unknown = parsed;
    if (!Array.isArray(parsed)) {
        const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        if (!record || !Array.isArray(record.features)) {
            return { ok: false, message: "Invalid feature file: expected a list of features." };
        }
        if (record.version !== undefined) {
            if (record.version !== FEATURE_FILE_VERSION) {
                return { ok: false, message: `Unsupported feature file version: ${JSON.stringify(record.version)}.` };
            }
            version = record.version;
        }
        entries = record.features;
    }

    const result = featuresArraySchema.safeParse(migrateLegacyFeatures(entries));
    if (!result.success) {
        return { ok: false, message: `Invalid feature file: ${result.error.issues[0]?.message ?? "unknown error"}` };
    }
    const features = normalizeImportedFeatures(result.data);
    return { ok: true, features: version < FEATURE_FILE_VERSION ? migrateFeaturesV1(features) : features };
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
                const parsed: unknown = JSON.parse((readerEvent.target?.result as string) || "null");
                const result = readFeatureFile(parsed);
                if (!result.ok) {
                    toast({ title: result.message, tone: "error" });
                    return;
                }

                onLoaded(result.features);
            } catch {
                toast({ title: "Failed to parse JSON.", tone: "error" });
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
