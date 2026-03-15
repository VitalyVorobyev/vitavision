import { useEditorStore, type PanelMode } from "../../../store/editor/useEditorStore";

import ConfigurePanel from "./ConfigurePanel";
import FeatureListPanel from "./FeatureListPanel";
import RailSection from "./RailSection";
import ResultsPanel from "./ResultsPanel";

const MODES: { key: PanelMode; label: string }[] = [
    { key: "configure", label: "Configure" },
    { key: "results", label: "Results" },
];

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

export default function EditorRightPanel() {
    const { panelMode, setPanelMode } = useEditorStore();

    return (
        <div className="w-80 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden">
            <div className="mb-4 shrink-0">
                <ModeToggle value={panelMode} onChange={setPanelMode} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">
                {panelMode === "configure" && <ConfigurePanel />}
                {panelMode === "results" && <ResultsPanel />}

                <RailSection label="Features">
                    <FeatureListPanel />
                </RailSection>
            </div>
        </div>
    );
}
