import { Disclosure, Field, InfoHint, NumberInput, Section, SegmentedControl } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../../lib/fieldBindings";
import type { AlgorithmConfigFormProps } from "../types";
import type { MarkerCircleCell } from "../../../../lib/types";

export interface MarkerBoardConfig {
    boardRows: number;
    boardCols: number;
    // Printed disk diameter as a fraction of the square side. Lives on the
    // board spec (`board.circle_diameter_rel`) since calib-targets 0.15 —
    // every radius the circle scorer probes is relative to it. Must equal the
    // value the board was printed with (targetgen's `circleDiameterRel`).
    circleDiameterRel: number;
    // The Rust printable spec and the detector spec both declare this as a
    // fixed-size array ([MarkerCircleSpec; 3]) — the count of three circles
    // is fixed by the library, not a UI choice.
    //
    // Held in app coordinates (row/col), the same way the target generator
    // holds them, and transposed to the library's i=col/j=row convention in
    // markerboardAdapter.ts. See MarkerCircleCell's doc comment.
    circles: [MarkerCircleCell, MarkerCircleCell, MarkerCircleCell];
    minCornerStrength: number;
    // Chessboard detector block. min_corner_strength, min_labeled_corners and
    // max_components are its only keys in calib-targets 0.15 (verified).
    minLabeledCorners: number;
    maxComponents: number;
    // Circle score sub-params
    circleScorePatchSize: number;
    circleScoreRingThicknessFrac: number;
    circleScoreRingRadiusMul: number;
    circleScoreMinContrast: number;
    circleScoreSamples: number;
    circleScoreCenterSearchPx: number;
    matchMaxCandidatesPerPolarity: number;
    matchMinOffsetInliers: number;
}

const POLARITY_OPTIONS: ChoiceOption<"white" | "black">[] = [
    { value: "white", label: "white" },
    { value: "black", label: "black" },
];

const MarkerBoardConfigForm = (props: AlgorithmConfigFormProps<MarkerBoardConfig>) => {
    const { config, onChange, disabled, modal } = props;
    const cols = modal ? 2 : undefined;

    const set = <K extends keyof MarkerBoardConfig>(key: K, value: MarkerBoardConfig[K]) =>
        onChange({ ...config, [key]: value });

    const updateCircle = (index: number, partial: Partial<MarkerCircleCell>) => {
        const circles = config.circles.map((c, idx) => (idx === index ? { ...c, ...partial } : c)) as MarkerBoardConfig["circles"];
        onChange({ ...config, circles });
    };

    return (
        <>
            <Section title="Board">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Rows"
                        as="group"
                        annotation={<InfoHint label="About rows">Total number of rows of squares on the marker board.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Rows"
                            {...numberInputProps(config.boardRows, (v) => set("boardRows", v ?? 22))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Cols"
                        as="group"
                        annotation={<InfoHint label="About cols">Total number of columns of squares on the marker board.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Cols"
                            {...numberInputProps(config.boardCols, (v) => set("boardCols", v ?? 22))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Circle diameter"
                        as="group"
                        annotation={
                            <InfoHint label="About circle diameter">
                                Printed disk diameter as a fraction of the square side. All circle-scoring radii are
                                relative to it, so it must match the board as printed. Library default: 0.5.
                            </InfoHint>
                        }
                    >
                        <NumberInput
                            aria-label="Circle diameter"
                            {...numberInputProps(config.circleDiameterRel, (v) => set("circleDiameterRel", v ?? 0.5))}
                            disabled={disabled}
                            min={0.1}
                            max={0.99}
                            step={0.05}
                        />
                    </Field>
                </div>
            </Section>
            <Section title="Expected circles">
                <div className={fieldGridClass()}>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-fg-muted">
                            <span className="w-14">Row</span>
                            <span className="w-14">Col</span>
                            <span>Polarity</span>
                        </div>
                        {config.circles.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                                <NumberInput
                                    className="w-14"
                                    {...numberInputProps(c.row, (v) => updateCircle(idx, { row: v ?? 0 }))}
                                    disabled={disabled}
                                    placeholder="row"
                                    min={0}
                                    step={1}
                                    aria-label={`Circle ${idx + 1} row`}
                                />
                                <NumberInput
                                    className="w-14"
                                    {...numberInputProps(c.col, (v) => updateCircle(idx, { col: v ?? 0 }))}
                                    disabled={disabled}
                                    placeholder="col"
                                    min={0}
                                    step={1}
                                    aria-label={`Circle ${idx + 1} column`}
                                />
                                <SegmentedControl
                                    aria-label={`Circle ${idx + 1} polarity`}
                                    {...choiceProps(c.polarity, POLARITY_OPTIONS, (polarity) => updateCircle(idx, { polarity }))}
                                    disabled={disabled}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </Section>
            <Disclosure summary="Chessboard detector">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Min corner strength"
                        as="group"
                        annotation={<InfoHint label="About min corner strength">Absolute floor on the raw ChESS response (detector default 15). Lower values detect weaker corners but may increase false positives.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min corner strength"
                            {...numberInputProps(config.minCornerStrength, (v) => set("minCornerStrength", v ?? 15))}
                            disabled={disabled}
                            min={0}
                            max={500}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min labeled corners"
                        as="group"
                        annotation={<InfoHint label="About min labeled corners">Fewest grid-labeled corners a detected board component may have. Raise it to ignore small fragments. Library default: 8.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min labeled corners"
                            {...numberInputProps(config.minLabeledCorners, (v) => set("minLabeledCorners", v ?? 8))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Max components"
                        as="group"
                        annotation={<InfoHint label="About max components">Most separate grid components kept per image. Library default: 3.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max components"
                            {...numberInputProps(config.maxComponents, (v) => set("maxComponents", v ?? 3))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Circle score">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Patch size"
                        as="group"
                        annotation={<InfoHint label="About patch size">Size of the image patch extracted around each candidate circle for scoring.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Patch size"
                            {...numberInputProps(config.circleScorePatchSize, (v) => set("circleScorePatchSize", v ?? 64))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Ring thickness fraction"
                        as="group"
                        annotation={<InfoHint label="About ring thickness fraction">Thickness of the scoring ring as a fraction of the circle radius.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Ring thickness fraction"
                            {...numberInputProps(config.circleScoreRingThicknessFrac, (v) => set("circleScoreRingThicknessFrac", v ?? 0.35))}
                            disabled={disabled}
                            min={0.01}
                            max={2}
                            step={0.05}
                        />
                    </Field>
                    <Field
                        label="Ring radius multiplier"
                        as="group"
                        annotation={<InfoHint label="About ring radius multiplier">Multiplier for the outer scoring ring radius relative to the circle edge.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Ring radius multiplier"
                            {...numberInputProps(config.circleScoreRingRadiusMul, (v) => set("circleScoreRingRadiusMul", v ?? 1.6))}
                            disabled={disabled}
                            min={0.01}
                            max={10}
                            step={0.1}
                        />
                    </Field>
                    <Field
                        label="Min contrast"
                        as="group"
                        annotation={<InfoHint label="About min contrast">Minimum intensity contrast between circle and background to accept a candidate.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min contrast"
                            {...numberInputProps(config.circleScoreMinContrast, (v) => set("circleScoreMinContrast", v ?? 10))}
                            disabled={disabled}
                            min={0}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Samples"
                        as="group"
                        annotation={<InfoHint label="About samples">Number of angular samples taken along the scoring ring.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Samples"
                            {...numberInputProps(config.circleScoreSamples, (v) => set("circleScoreSamples", v ?? 48))}
                            disabled={disabled}
                            min={1}
                            max={1024}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Center search"
                        as="group"
                        annotation={<InfoHint label="About center search">Pixel radius for subpixel circle center refinement search.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Center search"
                            {...numberInputProps(config.circleScoreCenterSearchPx, (v) => set("circleScoreCenterSearchPx", v ?? 2))}
                            disabled={disabled}
                            min={0}
                            max={256}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Advanced">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Max candidates per polarity"
                        as="group"
                        annotation={<InfoHint label="About max candidates per polarity">Maximum number of circle candidates kept per polarity (white/black) before matching. Higher → more thorough but slower. WASM default: 6.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Max candidates per polarity"
                            {...numberInputProps(config.matchMaxCandidatesPerPolarity, (v) => set("matchMaxCandidatesPerPolarity", v ?? 6))}
                            disabled={disabled}
                            min={1}
                            max={32}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Min offset inliers"
                        as="group"
                        annotation={<InfoHint label="About min offset inliers">Expected circles that must agree on one board frame. The three circles exist only to break the board's 4-fold rotational symmetry, so fewer than all three cannot fix the orientation. WASM default: 3.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Min offset inliers"
                            {...numberInputProps(config.matchMinOffsetInliers, (v) => set("matchMinOffsetInliers", v ?? 3))}
                            disabled={disabled}
                            min={1}
                            max={3}
                            step={1}
                        />
                    </Field>
                </div>
            </Disclosure>
        </>
    );
};

export default MarkerBoardConfigForm;
