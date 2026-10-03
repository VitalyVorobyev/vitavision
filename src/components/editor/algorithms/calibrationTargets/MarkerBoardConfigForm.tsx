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
    expectedRows: number;
    expectedCols: number;
    minCornerStrength: number;
    completenessThreshold: number;
    // Grid graph sub-params
    graphMinSpacingPix: number;
    graphMaxSpacingPix: number;
    graphKNeighbors: number;
    graphOrientationToleranceDeg: number;
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
                        label="Expected rows"
                        as="group"
                        annotation={<InfoHint label="About expected rows">Number of internal corner rows expected (squares minus one).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Expected rows"
                            {...numberInputProps(config.expectedRows, (v) => set("expectedRows", v ?? 22))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Expected cols"
                        as="group"
                        annotation={<InfoHint label="About expected cols">Number of internal corner columns expected (squares minus one).</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Expected cols"
                            {...numberInputProps(config.expectedCols, (v) => set("expectedCols", v ?? 22))}
                            disabled={disabled}
                            min={2}
                            step={1}
                        />
                    </Field>
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
                        label="Completeness threshold"
                        as="group"
                        annotation={<InfoHint label="About completeness threshold">Fraction of expected corners that must be detected for the board to be accepted.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="Completeness threshold"
                            {...numberInputProps(config.completenessThreshold, (v) => set("completenessThreshold", v ?? 0.05))}
                            disabled={disabled}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                    </Field>
                </div>
            </Disclosure>
            <Disclosure summary="Grid graph">
                <div className={fieldGridClass(cols)}>
                    <Field
                        label="Min spacing"
                        as="group"
                        annotation={<InfoHint label="About min spacing">Minimum distance between adjacent corners in pixels.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Min spacing"
                            {...numberInputProps(config.graphMinSpacingPix, (v) => set("graphMinSpacingPix", v ?? 20))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Max spacing"
                        as="group"
                        annotation={<InfoHint label="About max spacing">Maximum distance between adjacent corners in pixels.</InfoHint>}
                    >
                        <NumberInput
                            unit="px"
                            aria-label="Max spacing"
                            {...numberInputProps(config.graphMaxSpacingPix, (v) => set("graphMaxSpacingPix", v ?? 160))}
                            disabled={disabled}
                            min={1}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="K neighbors"
                        as="group"
                        annotation={<InfoHint label="About k neighbors">Number of nearest neighbors for graph construction. Higher handles irregular boards better.</InfoHint>}
                    >
                        <NumberInput
                            aria-label="K neighbors"
                            {...numberInputProps(config.graphKNeighbors, (v) => set("graphKNeighbors", v ?? 8))}
                            disabled={disabled}
                            min={1}
                            max={64}
                            step={1}
                        />
                    </Field>
                    <Field
                        label="Orientation tolerance"
                        as="group"
                        annotation={<InfoHint label="About orientation tolerance">Maximum angle deviation from grid directions when connecting corners.</InfoHint>}
                    >
                        <NumberInput
                            unit="°"
                            aria-label="Orientation tolerance"
                            {...numberInputProps(config.graphOrientationToleranceDeg, (v) => set("graphOrientationToleranceDeg", v ?? 12.5))}
                            disabled={disabled}
                            min={0}
                            max={180}
                            step={0.5}
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
