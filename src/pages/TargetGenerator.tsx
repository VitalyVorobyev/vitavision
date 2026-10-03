import SeoHead from "../components/seo/SeoHead";
import TargetTypeSelector from "../components/targetgen/panels/TargetTypeSelector";
import TargetConfigPanel from "../components/targetgen/panels/TargetConfigPanel";
import TargetPreview from "../components/targetgen/TargetPreview";
import TargetGeneratorWizard from "../components/targetgen/TargetGeneratorWizard";
import { useTargetGenerator } from "../components/targetgen/useTargetGenerator";
// Injected into the synced config panel (it must not import the WASM-backed
// generator itself); without it the DXF and ZIP buttons stay disabled.
import { generateDxf } from "../components/targetgen/dxf";
import { DensityProvider } from "@vitavision/ui";
import useViewportMode from "../hooks/useViewportMode";

export default function TargetGenerator() {
    const { state, dispatch, puzzlepolePeriods } = useTargetGenerator();
    const { isTouchPrimary, isPhone } = useViewportMode();

    return (
        <>
            <SeoHead
                title="Target Generator"
                description="Generate printable calibration targets: chessboard, ChArUco, and marker board patterns."
            />

            {isTouchPrimary ? (
                <TargetGeneratorWizard
                    key={isPhone ? "phone" : "touch"}
                    state={state}
                    dispatch={dispatch}
                    isPhone={isPhone}
                    puzzlepolePeriods={puzzlepolePeriods}
                />
            ) : (
                <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-in fade-in">
                    <div className="w-40 lg:w-56 border-r border-line bg-surface overflow-y-auto shrink-0">
                        <TargetTypeSelector
                            selected={state.target.targetType}
                            dispatch={dispatch}
                        />
                    </div>

                    <TargetPreview state={state} dispatch={dispatch} />

                    <div className="w-80 border-l border-line bg-surface overflow-y-auto shrink-0">
                        <DensityProvider value="compact">
                            <TargetConfigPanel
                                state={state}
                                dispatch={dispatch}
                                generateDxf={generateDxf}
                                puzzlepolePeriods={puzzlepolePeriods}
                            />
                        </DensityProvider>
                    </div>
                </div>
            )}
        </>
    );
}
