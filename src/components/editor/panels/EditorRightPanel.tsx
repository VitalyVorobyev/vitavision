import { useEditorStore } from "../../../store/editor/useEditorStore";

import ConfigurePanel from "./ConfigurePanel";
import FeatureListPanel from "./FeatureListPanel";
import RailSection from "./RailSection";

export default function EditorRightPanel() {
    const { panelMode } = useEditorStore();

    return (
        <div className="w-80 border-l border-border bg-muted/20 p-4 shrink-0 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-5 pr-0.5">
                {panelMode === "configure" && <ConfigurePanel />}

                <RailSection label="Features">
                    <FeatureListPanel />
                </RailSection>
            </div>
        </div>
    );
}
