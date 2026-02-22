import { useState } from "react";

import AlgorithmPanel from "./AlgorithmPanel";
import FeatureListPanel from "./FeatureListPanel";

type RightPanelTab = "features" | "algorithms";

export default function EditorRightPanel() {
    const [activeTab, setActiveTab] = useState<RightPanelTab>("features");

    return (
        <div className="w-80 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden">
            <div className="mb-4 inline-flex rounded-md border border-border overflow-hidden">
                <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${activeTab === "features" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("features")}
                >
                    Features
                </button>
                <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${activeTab === "algorithms" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("algorithms")}
                >
                    Algorithms
                </button>
            </div>

            {activeTab === "features" ? <FeatureListPanel /> : <AlgorithmPanel />}
        </div>
    );
}
