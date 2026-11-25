import { Callout, Field, InfoHint, NumberInput, Section, SegmentedControl } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../lib/fieldBindings";
import { detectDisplayPx } from "../screenTarget";
import type { Medium, ScreenSettings, TargetGeneratorAction } from "../types";

const MEDIUM_OPTIONS: ChoiceOption<Medium>[] = [
    { value: "print", label: "Print" },
    { value: "screen", label: "Screen" },
];

interface MediumProps {
    medium: Medium;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

/** Print (paper, today's behaviour) / Screen (pixel-native PNG for a monitor). */
export function MediumSwitch({ medium, dispatch }: MediumProps) {
    return (
        <Section title="Medium">
            <div className={fieldGridClass()}>
                <Field
                    label="Output for"
                    as="group"
                    annotation={
                        <InfoHint label="About medium">
                            Print makes a vector page (SVG, PNG, DXF) at a physical size. Screen makes an
                            anti-aliased, pixel-native PNG to show 1:1 on a monitor.
                        </InfoHint>
                    }
                >
                    <SegmentedControl
                        aria-label="Medium"
                        {...choiceProps(medium, MEDIUM_OPTIONS, (v) =>
                            // The display size is read here, at the event, never in render.
                            dispatch({ type: "SET_MEDIUM", medium: v, displayPx: detectDisplayPx() }),
                        )}
                    />
                </Field>
            </div>
        </Section>
    );
}

interface ScreenProps {
    screen: ScreenSettings;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

/** The display the screen target is rendered for: the library's own inputs. */
export default function ScreenConfig({ screen, dispatch }: ScreenProps) {
    const update = (partial: Partial<ScreenSettings>) => dispatch({ type: "UPDATE_SCREEN", partial });

    return (
        <Section title="Display">
            <div className={fieldGridClass()}>
                <Field
                    label="Width"
                    as="group"
                    annotation={
                        <InfoHint label="About width">
                            Native horizontal resolution of the display in pixels. Prefilled from this browser
                            (screen width × device pixel ratio); correct it if you will show the target on
                            another display.
                        </InfoHint>
                    }
                >
                    <NumberInput
                        unit="px"
                        aria-label="Width"
                        {...numberInputProps(screen.widthPx, (v) => update({ widthPx: v ?? screen.widthPx }))}
                        min={1}
                        step={1}
                    />
                </Field>
                <Field
                    label="Height"
                    as="group"
                    annotation={<InfoHint label="About height">Native vertical resolution of the display in pixels.</InfoHint>}
                >
                    <NumberInput
                        unit="px"
                        aria-label="Height"
                        {...numberInputProps(screen.heightPx, (v) => update({ heightPx: v ?? screen.heightPx }))}
                        min={1}
                        step={1}
                    />
                </Field>
                <Field
                    label="Pixel pitch"
                    as="group"
                    annotation={
                        <InfoHint label="About pixel pitch">
                            Physical distance between pixel centres: the panel&rsquo;s active width in mm divided by
                            its horizontal pixel count. It is on the display&rsquo;s spec sheet; the browser cannot
                            know it, so 0.25 mm is only a placeholder. A wrong pitch scales every metric size.
                        </InfoHint>
                    }
                >
                    <NumberInput
                        unit="mm"
                        aria-label="Pixel pitch"
                        {...numberInputProps(screen.pixelPitchMm, (v) => update({ pixelPitchMm: v ?? screen.pixelPitchMm }))}
                        min={0.01}
                        step={0.001}
                    />
                </Field>
                <Field
                    label="Margin"
                    as="group"
                    annotation={
                        <InfoHint label="About margin">
                            Minimum white border around the board, in pixels. Leave blank for the library default
                            (1 px for chessboards, ChArUco and PuzzleBoard; ring grids pick their own).
                        </InfoHint>
                    }
                >
                    <NumberInput
                        unit="px"
                        aria-label="Margin"
                        placeholder="auto"
                        {...numberInputProps(screen.marginPx ?? undefined, (v) => update({ marginPx: v ?? null }))}
                        min={0}
                        step={1}
                    />
                </Field>
                <Callout tone="info" className="text-xs">
                    Show the PNG at 100 % (one image pixel per screen pixel) on this display. Any scaling
                    blurs the pattern and invalidates the sizes reported in the sidecar.
                </Callout>
            </div>
        </Section>
    );
}
