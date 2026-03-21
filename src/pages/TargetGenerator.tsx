import SeoHead from "../components/seo/SeoHead";
import TargetTypeSelector from "../components/targetgen/panels/TargetTypeSelector";
import TargetConfigPanel from "../components/targetgen/panels/TargetConfigPanel";
import TargetPreview from "../components/targetgen/TargetPreview";
import { useTargetGenerator } from "../components/targetgen/useTargetGenerator";

export default function TargetGenerator() {
    const { state, dispatch } = useTargetGenerator();

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
            <SeoHead
                title="Target Generator"
                description="Generate printable calibration targets: chessboard, ChArUco, and marker board patterns."
            />

            {/* Left — target type selector */}
            <div className="w-40 lg:w-56 border-r border-border bg-muted/20 overflow-y-auto shrink-0">
                <TargetTypeSelector
                    selected={state.target.targetType}
                    dispatch={dispatch}
                />
            </div>

            {/* Center — preview */}
            <TargetPreview state={state} dispatch={dispatch} />

            {/* Right — config + downloads */}
            <div className="w-80 border-l border-border bg-muted/20 overflow-y-auto shrink-0">
                <TargetConfigPanel
                    state={state}
                    dispatch={dispatch}
                />
            </div>
        </div>
    );
}
