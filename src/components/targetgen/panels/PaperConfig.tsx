import { Checkbox, Field, InfoHint, NumberInput, Section, SegmentedControl } from "@vitavision/ui";
import { choiceProps, fieldGridClass, numberInputProps, type ChoiceOption } from "../../../lib/fieldBindings";
import type { PageConfig, Orientation, PageSizeKind, TargetGeneratorAction } from "../types";

const PAGE_SIZE_OPTIONS: ChoiceOption<PageSizeKind>[] = [
    { value: "a4", label: "A4" },
    { value: "letter", label: "Letter" },
    { value: "custom", label: "Custom" },
];

const ORIENTATION_OPTIONS: ChoiceOption<Orientation>[] = [
    { value: "portrait", label: "Portrait" },
    { value: "landscape", label: "Landscape" },
];

interface Props {
    page: PageConfig;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function PaperConfig({ page, dispatch }: Props) {
    const update = (partial: Partial<PageConfig>) =>
        dispatch({ type: "UPDATE_PAGE", partial });

    return (
        <Section title="Page">
            <div className={fieldGridClass()}>
                <Field
                    label="Size"
                    as="group"
                    annotation={<InfoHint label="About size">Paper size for the printed target: A4 is 210 × 297 mm, Letter 8.5 × 11 in.</InfoHint>}
                >
                    <SegmentedControl
                        aria-label="Size"
                        {...choiceProps(page.sizeKind, PAGE_SIZE_OPTIONS, (v) => update({ sizeKind: v }))}
                    />
                </Field>
                {page.sizeKind === "custom" && (
                    <>
                        <Field
                            label="Width"
                            as="group"
                            annotation={<InfoHint label="About width">Custom page width in millimeters</InfoHint>}
                        >
                            <NumberInput
                                unit="mm"
                                aria-label="Width"
                                {...numberInputProps(page.customWidthMm, (v) => update({ customWidthMm: v ?? 210 }))}
                                min={10}
                                max={2000}
                                step={1}
                            />
                        </Field>
                        <Field
                            label="Height"
                            as="group"
                            annotation={<InfoHint label="About height">Custom page height in millimeters</InfoHint>}
                        >
                            <NumberInput
                                unit="mm"
                                aria-label="Height"
                                {...numberInputProps(page.customHeightMm, (v) => update({ customHeightMm: v ?? 297 }))}
                                min={10}
                                max={2000}
                                step={1}
                            />
                        </Field>
                    </>
                )}
                <Field
                    label="Orientation"
                    as="group"
                    annotation={<InfoHint label="About orientation">Portrait (tall) or landscape (wide) page layout</InfoHint>}
                >
                    <SegmentedControl
                        aria-label="Orientation"
                        {...choiceProps(page.orientation, ORIENTATION_OPTIONS, (v) => update({ orientation: v }))}
                    />
                </Field>
                <Field
                    label="Margin"
                    as="group"
                    annotation={<InfoHint label="About margin">Minimum margin around the board on all sides</InfoHint>}
                >
                    <NumberInput
                        unit="mm"
                        aria-label="Margin"
                        {...numberInputProps(page.marginMm, (v) => update({ marginMm: v ?? 10 }))}
                        min={0}
                        max={100}
                        step={1}
                    />
                </Field>
                <Field
                    label="PNG DPI"
                    as="group"
                    annotation={<InfoHint label="About PNG DPI">Resolution for PNG export (dots per inch)</InfoHint>}
                >
                    <NumberInput
                        aria-label="PNG DPI"
                        {...numberInputProps(page.pngDpi, (v) => update({ pngDpi: v ?? 300 }))}
                        min={72}
                        max={1200}
                        step={1}
                    />
                </Field>
                <Checkbox
                    label="Show scale line"
                    checked={page.showScaleLine}
                    onCheckedChange={(checked) => update({ showScaleLine: checked })}
                />
            </div>
        </Section>
    );
}
