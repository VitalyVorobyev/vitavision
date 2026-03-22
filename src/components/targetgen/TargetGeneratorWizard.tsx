import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, TriangleAlert } from "lucide-react";

import TargetTypeSelector from "./panels/TargetTypeSelector";
import TargetConfigPanel from "./panels/TargetConfigPanel";
import TargetPreview from "./TargetPreview";
import type { TargetGeneratorAction, TargetGeneratorState, TargetType } from "./types";
import { presetsForType } from "./presets";

export type TargetGeneratorStep = "target" | "pattern" | "page" | "export";

const STEPS: { key: TargetGeneratorStep; label: string; description: string }[] = [
    { key: "target", label: "Target", description: "Choose target type or import a saved configuration" },
    { key: "pattern", label: "Pattern", description: "Apply a preset, then adjust board geometry and target-specific settings" },
    { key: "page", label: "Page", description: "Set paper size, orientation, margins, and export density" },
    { key: "export", label: "Export", description: "Review validation and download files" },
];

const TARGET_LABELS: Record<TargetType, string> = {
    chessboard: "Chessboard",
    charuco: "ChArUco",
    markerboard: "Marker Board",
    ringgrid: "Ring Grid",
};

function WizardStepCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-4 sm:px-5">
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="p-1 sm:p-2">
                {children}
            </div>
        </section>
    );
}

function PresetRow({
    state,
    dispatch,
}: {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}) {
    const presets = presetsForType(state.target.targetType);
    const activePresetId = presets.find((preset) =>
        JSON.stringify(preset.target) === JSON.stringify(state.target)
        && JSON.stringify(preset.page) === JSON.stringify(state.page),
    )?.id;
    const activePreset = presets.find((preset) => preset.id === activePresetId) ?? null;

    return (
        <section className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                Presets
            </div>
            <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => {
                    const active = preset.id === activePresetId;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => dispatch({
                                type: "LOAD_PRESET",
                                target: preset.target,
                                page: preset.page,
                            })}
                            className={`min-w-0 rounded-md border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                                active
                                    ? "border-primary/30 bg-primary/10 text-foreground"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                            aria-pressed={active}
                            title={preset.label}
                        >
                            <span className="block truncate">{preset.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="mt-2 px-0.5 text-[11px] leading-5 text-muted-foreground">
                {activePreset
                    ? `${activePreset.label}: ${activePreset.description}`
                    : "Pick a preset to load a ready-made starting point for this target type."}
            </div>
        </section>
    );
}

export default function TargetGeneratorWizard({
    state,
    dispatch,
    isPhone,
}: {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
    isPhone: boolean;
}) {
    const [activeStep, setActiveStep] = useState<TargetGeneratorStep>("target");
    const [previewOpen, setPreviewOpen] = useState(!isPhone);

    const activeIndex = STEPS.findIndex((step) => step.key === activeStep);
    const canGoBack = activeIndex > 0;
    const canGoForward = activeIndex < STEPS.length - 1;
    const warningCount = state.validation.warnings.length;
    const errorCount = state.validation.errors.length;

    const summaryLine = useMemo(() => {
        const orientation = state.page.orientation === "portrait" ? "Portrait" : "Landscape";
        const page = state.page.sizeKind === "custom"
            ? `${state.page.customWidthMm} x ${state.page.customHeightMm} mm`
            : state.page.sizeKind.toUpperCase();
        return `${TARGET_LABELS[state.target.targetType]} • ${page} • ${orientation}`;
    }, [state.page, state.target.targetType]);

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden animate-in fade-in bg-background">
            <div className="border-b border-border bg-muted/10 px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Target Generator</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Progressive touch workflow with the live preview always within reach.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPreviewOpen((open) => !open)}
                        className="inline-flex min-h-14 min-w-[8.75rem] shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        aria-expanded={previewOpen}
                    >
                        {previewOpen ? <EyeOff size={16} /> : <Eye size={16} />}
                        {previewOpen ? "Hide Preview" : "Show Preview"}
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                    {STEPS.map((step, index) => {
                        const active = step.key === activeStep;
                        return (
                            <button
                                key={step.key}
                                type="button"
                                onClick={() => setActiveStep(step.key)}
                                className={`min-w-0 rounded-xl border px-3 py-2 text-left transition-colors ${
                                    active
                                        ? "border-primary/30 bg-primary/10 text-foreground"
                                        : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                }`}
                            >
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                                    Step {index + 1}
                                </div>
                                <div className="mt-1 text-sm font-medium">{step.label}</div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{summaryLine}</span>
                    {(errorCount > 0 || warningCount > 0) && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                            errorCount > 0
                                ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        }`}>
                            <TriangleAlert size={12} />
                            {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? "s" : ""}` : `${warningCount} warning${warningCount > 1 ? "s" : ""}`}
                        </span>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6">
                    {activeStep === "target" && (
                        <WizardStepCard
                            title="Choose the target"
                            description="Pick the board family first. Presets and detailed tuning live in the next step."
                        >
                            <TargetTypeSelector
                                selected={state.target.targetType}
                                dispatch={dispatch}
                                showPresets={false}
                                layout="grid"
                            />
                        </WizardStepCard>
                    )}

                    {activeStep === "pattern" && (
                        <WizardStepCard
                            title="Pattern settings"
                            description="Apply a preset if useful, then tune the board geometry and the target-specific fields."
                        >
                            <div className="space-y-3">
                                <PresetRow state={state} dispatch={dispatch} />
                                <TargetConfigPanel
                                    state={state}
                                    dispatch={dispatch}
                                    sections={["pattern"]}
                                />
                            </div>
                        </WizardStepCard>
                    )}

                    {activeStep === "page" && (
                        <WizardStepCard
                            title="Page settings"
                            description="Define paper dimensions, orientation, margins, and export resolution."
                        >
                            <TargetConfigPanel
                                state={state}
                                dispatch={dispatch}
                                sections={["page"]}
                            />
                        </WizardStepCard>
                    )}

                    {activeStep === "export" && (
                        <WizardStepCard
                            title="Review and export"
                            description="Check validation messages, then download the target in the required file format."
                        >
                            <TargetConfigPanel
                                state={state}
                                dispatch={dispatch}
                                sections={["validation", "downloads"]}
                            />
                        </WizardStepCard>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => canGoBack && setActiveStep(STEPS[activeIndex - 1].key)}
                            disabled={!canGoBack}
                            className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={() => canGoForward && setActiveStep(STEPS[activeIndex + 1].key)}
                            disabled={!canGoForward}
                            className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-t border-border bg-background">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                            Live Preview
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Current board, page, and printable area
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPreviewOpen((open) => !open)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        {previewOpen ? "Collapse" : "Expand"}
                    </button>
                </div>
                {previewOpen && (
                    <div className={`${isPhone ? "h-[18rem]" : "h-[22rem]"} flex border-t border-border`}>
                        <TargetPreview state={state} dispatch={dispatch} />
                    </div>
                )}
            </div>
        </div>
    );
}
