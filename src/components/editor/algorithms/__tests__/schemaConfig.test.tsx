import { fireEvent, render, screen, within } from "@testing-library/react";
import Ajv2020 from "ajv/dist/2020";
import type { JsonSchema, UiSchema } from "@vitavision/forms";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { hiddenPaths as chessCornersHidden, ui as chessCornersUi } from "../chessCorners/ui";
import { hiddenPaths as chessboardHidden, ui as chessboardUi } from "../calibrationTargets/chessboard/ui";
import { hiddenPaths as charucoHidden, ui as charucoUi } from "../calibrationTargets/charuco/ui";
import { hiddenPaths as markerboardHidden, ui as markerboardUi } from "../calibrationTargets/markerboard/ui";
import { hiddenPaths as puzzleboardHidden, ui as puzzleboardUi } from "../puzzleboard/ui";
import { hiddenPaths as ringgridHidden, ui as ringgridUi } from "../ringgrid/ui";
import { hiddenPaths as radsymHidden, ui as radsymUi } from "../radsym/ui";
import { schema as chessCornersSchema } from "../chessCorners/schema";
import { schema as chessboardSchema } from "../calibrationTargets/chessboard/schema";
import { schema as charucoSchema } from "../calibrationTargets/charuco/schema";
import { schema as markerboardSchema } from "../calibrationTargets/markerboard/schema";
import { schema as puzzleboardSchema } from "../puzzleboard/schema";
import { schema as ringgridSchema } from "../ringgrid/schema";
import { schema as radsymSchema } from "../radsym/schema";
import { loadAlgorithm } from "../registry";
import { readOnlyPaths, walkFields } from "../schemaTools";

interface Case {
    id: string;
    schema: JsonSchema;
    ui: UiSchema;
    hiddenPaths: string[];
}

const CASES: Case[] = [
    { id: "chess-corners", schema: chessCornersSchema, ui: chessCornersUi, hiddenPaths: chessCornersHidden },
    { id: "chessboard", schema: chessboardSchema, ui: chessboardUi, hiddenPaths: chessboardHidden },
    { id: "charuco", schema: charucoSchema, ui: charucoUi, hiddenPaths: charucoHidden },
    { id: "markerboard", schema: markerboardSchema, ui: markerboardUi, hiddenPaths: markerboardHidden },
    { id: "ringgrid", schema: ringgridSchema, ui: ringgridUi, hiddenPaths: ringgridHidden },
    { id: "radsym", schema: radsymSchema, ui: radsymUi, hiddenPaths: radsymHidden },
    { id: "puzzleboard", schema: puzzleboardSchema, ui: puzzleboardUi, hiddenPaths: puzzleboardHidden },
];

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}.`);

// The Rust integer/float widths (`uint32`, `float`) are annotations, not constraints the
// validator needs, and `x-unit` / `x-primary` are the packages' own keywords.
function validator(schema: JsonSchema) {
    const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
    return ajv.compile(schema as object);
}

describe.each(CASES)("$id config", ({ id, schema, ui, hiddenPaths }) => {
    it("validates, as initialConfig, every preset and every sample default, against the package schema", async () => {
        const algo = await loadAlgorithm(id);
        const validate = validator(schema);
        const configs: Array<[string, unknown]> = [
            ["initialConfig", algo.initialConfig],
            ...(algo.presets ?? []).map((p): [string, unknown] => [`preset ${p.label}`, p.config]),
            ...Object.entries(algo.sampleDefaults ?? {}).map(([sample, config]): [string, unknown] => [`sample ${sample}`, config]),
        ];
        for (const [label, config] of configs) {
            expect(validate(config), `${label}: ${JSON.stringify(validate.errors?.slice(0, 3))}`).toBe(true);
        }
    });

    it("accounts for every field of the schema: in a group, or deliberately hidden", () => {
        const groups = ui.groups ?? [];
        const listed = groups.flatMap((group) => group.fields);
        const stray: string[] = [];
        walkFields(schema, (path, _node, shape) => {
            const leaf = !["object", "tagged", "external"].includes(shape.kind);
            if (!leaf) return true;
            const accounted = listed.some((p) => isUnder(path, p)) || hiddenPaths.some((p) => isUnder(path, p));
            if (!accounted) stray.push(path);
            return true;
        });
        expect(stray).toEqual([]);
    });

    it("names, in its groups and hidden fields, only paths the schema has", () => {
        const known = new Set<string>();
        walkFields(schema, (path) => {
            known.add(path);
        });
        const named = [...(ui.groups ?? []).flatMap((group) => group.fields), ...hiddenPaths];
        const unknown = named.filter((path) => !known.has(path));
        expect(unknown).toEqual([]);
    });

    it("hides every field the schema marks readOnly", () => {
        for (const path of readOnlyPaths(schema)) {
            expect(hiddenPaths.some((p) => isUnder(path, p)), path).toBe(true);
        }
    });

    it("keeps readOnly fields out of its stored configs", async () => {
        const algo = await loadAlgorithm(id);
        const stored = JSON.stringify([algo.initialConfig, ...(algo.presets ?? []).map((p) => p.config)]);
        for (const path of readOnlyPaths(schema)) {
            const leaf = path.split(".").at(-1)!;
            // A key of that name may exist elsewhere in the document; check the exact path.
            let node: unknown = algo.initialConfig;
            for (const part of path.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
            expect(node, `${path} in ${leaf}`).toBeUndefined();
        }
        expect(stored.length).toBeGreaterThan(0);
    });
});

describe.each(CASES)("$id form", ({ id }) => {
    async function renderForm(modal = false) {
        const algo = await loadAlgorithm(id);
        const Form = algo.ConfigComponent;
        const onChange = vi.fn();
        const view = render(<Form config={algo.initialConfig} onChange={onChange} disabled={false} modal={modal} />);
        return { algo, onChange, ...view };
    }

    it("renders its groups with no empty frame", async () => {
        const { container } = await renderForm();
        // Open every disclosure so nested frames render too.
        container.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
        for (const frame of container.querySelectorAll("fieldset")) {
            expect(frame.querySelector("input, button, textarea, [role=radio], [role=switch], [role=checkbox]"), frame.textContent ?? "").not.toBeNull();
        }
        expect(container.querySelectorAll("h3, summary").length).toBeGreaterThan(0);
    });

    it("renders in one column in the rail and two in the dialog", async () => {
        const rail = await renderForm(false);
        expect(rail.container.querySelector("[data-columns='1']")).not.toBeNull();
        rail.unmount();
        const dialog = await renderForm(true);
        expect(dialog.container.querySelector("[data-columns='2']")).not.toBeNull();
    });

    it("blocks every control while disabled", async () => {
        const algo = await loadAlgorithm(id);
        const Form = algo.ConfigComponent;
        const { container } = render(<Form config={algo.initialConfig} onChange={() => {}} disabled modal />);
        container.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
        const inputs = container.querySelectorAll("input[type=number], input[type=text]");
        expect(inputs.length).toBeGreaterThan(0);
        for (const input of inputs) expect(input).toBeDisabled();
    });
});

describe("editing", () => {
    // jsdom has no layout: the select's list scrolls its active option into view.
    beforeAll(() => {
        Element.prototype.scrollIntoView = () => {};
    });

    it("chess-corners: a number edit hands back the whole config with only that leaf changed", async () => {
        const algo = await loadAlgorithm("chess-corners");
        const Form = algo.ConfigComponent;
        const onChange = vi.fn();
        render(<Form config={algo.initialConfig} onChange={onChange} disabled={false} />);
        const threshold = screen.getByRole("spinbutton", { name: "Response threshold" });
        fireEvent.focus(threshold);
        fireEvent.change(threshold, { target: { value: "45" } });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0]![0]).toEqual({ ...(algo.initialConfig as object), threshold: 45 });
    });

    it("chess-corners: choosing a refiner swaps the whole variant", async () => {
        const algo = await loadAlgorithm("chess-corners");
        const Form = algo.ConfigComponent;
        const onChange = vi.fn();
        const { container } = render(<Form config={algo.initialConfig} onChange={onChange} disabled={false} />);
        container.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
        fireEvent.click(screen.getByRole("combobox", { name: "Refiner" }));
        fireEvent.click(await screen.findByRole("option", { name: "Förstner" }));
        const next = onChange.mock.calls[0]![0] as { strategy: { chess: { refiner: Record<string, unknown> } } };
        expect(Object.keys(next.strategy.chess.refiner)).toEqual(["forstner"]);
    });

    it("radsym: the radius range is edited as a minimum and a maximum", async () => {
        const algo = await loadAlgorithm("radsym");
        const Form = algo.ConfigComponent;
        const onChange = vi.fn();
        render(<Form config={algo.initialConfig} onChange={onChange} disabled={false} />);
        expect(screen.getByRole("spinbutton", { name: "Min radius" })).toHaveValue(5);
        const max = screen.getByRole("spinbutton", { name: "Max radius" });
        expect(max).toHaveValue(40);
        fireEvent.focus(max);
        fireEvent.change(max, { target: { value: "12" } });
        const next = onChange.mock.calls[0]![0] as { config: { radii: number[] } };
        expect(next.config.radii).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it("radsym: a radii list that is not a range is left to the form's JSON control", async () => {
        const algo = await loadAlgorithm("radsym");
        const Form = algo.ConfigComponent;
        const config = { ...(algo.initialConfig as { config: object }), config: { ...(algo.initialConfig as { config: object }).config, radii: [3, 5, 9] } };
        render(<Form config={config} onChange={() => {}} disabled={false} />);
        expect(screen.queryByRole("spinbutton", { name: "Min radius" })).toBeNull();
        expect(screen.getByRole("textbox", { name: /radii/i })).toBeInTheDocument();
    });

    it("markerboard: the circle cells say which of i / j is the column and which the row", async () => {
        const algo = await loadAlgorithm("markerboard");
        const Form = algo.ConfigComponent;
        render(<Form config={algo.initialConfig} onChange={() => {}} disabled={false} />);
        const first = screen.getByRole("group", { name: "Circles 0" });
        // The first default circle sits at row 11, column 11; the second one row below it.
        expect(within(first).getByRole("spinbutton", { name: "Column (i)" })).toHaveValue(11);
        expect(within(first).getByRole("spinbutton", { name: "Row (j)" })).toHaveValue(11);
        const second = screen.getByRole("group", { name: "Circles 1" });
        expect(within(second).getByRole("spinbutton", { name: "Column (i)" })).toHaveValue(11);
        expect(within(second).getByRole("spinbutton", { name: "Row (j)" })).toHaveValue(12);
    });

    it("ringgrid: the lattice shows the fields of the chosen variant, and derived fields are not offered", async () => {
        const algo = await loadAlgorithm("ringgrid");
        const Form = algo.ConfigComponent;
        const { container } = render(<Form config={algo.initialConfig} onChange={() => {}} disabled={false} modal />);
        container.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
        expect(screen.getByRole("spinbutton", { name: "Rows" })).toHaveValue(15);
        expect(screen.getByRole("spinbutton", { name: "Long row cols" })).toHaveValue(14);
        expect(screen.getByRole("spinbutton", { name: "Pitch" })).toHaveValue(8);
        expect(screen.getByRole("spinbutton", { name: "Ring width" })).toHaveValue(1.152);
        for (const derived of ["Roi radius px", "Code band ratio", "R inner expected", "Search halfwidth px"]) {
            expect(screen.queryByRole("spinbutton", { name: derived }), derived).toBeNull();
        }
    });

    it("charuco: dictionaries carry the labels the form always had", async () => {
        const algo = await loadAlgorithm("charuco");
        const Form = algo.ConfigComponent;
        render(<Form config={algo.initialConfig} onChange={() => {}} disabled={false} />);
        expect(screen.getByRole("combobox", { name: "Dictionary" })).toHaveTextContent("4×4 (1000)");
    });
});
