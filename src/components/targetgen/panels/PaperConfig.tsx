import { Section, NumberField, SelectField, type FieldOption } from "../../editor/algorithms/formFields";
import type { PageConfig, Orientation, PageSizeKind, TargetGeneratorAction } from "../types";

const PAGE_SIZE_OPTIONS: FieldOption<PageSizeKind>[] = [
    { value: "a4", label: "A4 (210 x 297 mm)", shortLabel: "A4" },
    { value: "letter", label: "Letter (8.5 x 11 in)", shortLabel: "Letter" },
    { value: "custom", label: "Custom", shortLabel: "Custom" },
];

const ORIENTATION_OPTIONS: FieldOption<Orientation>[] = [
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
            <SelectField
                label="Size"
                value={page.sizeKind}
                onChange={(v) => update({ sizeKind: v })}
                disabled={false}
                options={PAGE_SIZE_OPTIONS}
                tooltip="Paper size for the printed target"
            />
            {page.sizeKind === "custom" && (
                <>
                    <NumberField
                        label="Width (mm)"
                        value={page.customWidthMm}
                        onChange={(v) => update({ customWidthMm: v ?? 210 })}
                        disabled={false}
                        min={10}
                        max={2000}
                        step={1}
                        tooltip="Custom page width in millimeters"
                    />
                    <NumberField
                        label="Height (mm)"
                        value={page.customHeightMm}
                        onChange={(v) => update({ customHeightMm: v ?? 297 })}
                        disabled={false}
                        min={10}
                        max={2000}
                        step={1}
                        tooltip="Custom page height in millimeters"
                    />
                </>
            )}
            <SelectField
                label="Orientation"
                value={page.orientation}
                onChange={(v) => update({ orientation: v })}
                disabled={false}
                options={ORIENTATION_OPTIONS}
                tooltip="Portrait (tall) or landscape (wide) page layout"
            />
            <NumberField
                label="Margin (mm)"
                value={page.marginMm}
                onChange={(v) => update({ marginMm: v ?? 10 })}
                disabled={false}
                min={0}
                max={100}
                step={1}
                tooltip="Minimum margin around the board on all sides"
            />
            <NumberField
                label="PNG DPI"
                value={page.pngDpi}
                onChange={(v) => update({ pngDpi: v ?? 300 })}
                disabled={false}
                min={72}
                max={1200}
                step={1}
                tooltip="Resolution for PNG export (dots per inch)"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                    type="checkbox"
                    checked={page.showScaleLine}
                    onChange={(e) => update({ showScaleLine: e.target.checked })}
                    className="rounded border-border"
                />
                Show scale line
            </label>
        </Section>
    );
}
