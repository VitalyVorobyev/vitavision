import { featuresArraySchema } from "../../store/editor/featureSchema";
import { normalizeImportedFeatures, type Feature } from "../../store/editor/useEditorStore";

export function exportFeaturesAsJson(features: Feature[]) {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(features, null, 2))}`;
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
                const result = featuresArraySchema.safeParse(parsed);
                if (!result.success) {
                    window.alert(`Invalid feature file: ${result.error.issues[0]?.message ?? "unknown error"}`);
                    return;
                }

                onLoaded(normalizeImportedFeatures(result.data));
            } catch {
                window.alert("Failed to parse JSON.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
