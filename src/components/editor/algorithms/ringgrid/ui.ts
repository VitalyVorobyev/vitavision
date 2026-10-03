import type { UiGroup, UiSchema } from "@vitavision/forms";

import { hidden, hideContainers, readOnlyPaths } from "../schemaTools";
import { schema } from "./schema";

const groups: UiGroup[] = [
    { id: "grid", title: "Grid layout", fields: ["board.lattice", "board.fiducials"] },
    {
        id: "marker",
        title: "Marker geometry",
        fields: ["board.marker.outer_radius_mm", "board.marker.inner_radius_mm", "board.coding"],
    },
    {
        id: "scale",
        title: "Detection scale",
        collapsible: true,
        fields: ["config.marker_scale.diameter_min_px", "config.marker_scale.diameter_max_px"],
    },
    { id: "proposals", title: "Proposals", collapsible: true, fields: ["config.advanced.proposal.grad_threshold"] },
    {
        id: "decode",
        title: "Decode",
        collapsible: true,
        fields: ["config.advanced.decode.max_decode_dist", "config.advanced.decode.min_decode_confidence"],
    },
    {
        id: "advanced",
        title: "Advanced",
        collapsible: true,
        fields: [
            "config.advanced.completion.enable",
            "config.self_undistort.enable",
            "config.self_undistort",
            "config.circle_refinement",
            "config.require_complete_board",
            "config.advanced",
        ],
    },
];

/**
 * Fields deliberately not offered; the schema's other fields are all in a group. Board
 * metadata the detector does not read, and the fields the library derives from the board
 * itself when it loads a config (the schema marks them `readOnly`).
 */
export const hiddenPaths: string[] = ["board.schema", "board.name", ...readOnlyPaths(schema)];

export const ui: UiSchema = {
    groups,
    fields: {
        "board.lattice": {
            label: "Lattice",
            hint: "Hexagonal lattices alternate long and short rows; rectangular ones are a plain rows × cols grid.",
            enumLabels: { hex: "Hex", rect: "Rect" },
        },
        "board.lattice.rows": { label: "Rows", hint: "Number of lattice rows." },
        "board.lattice.long_row_cols": { label: "Long row cols", hint: "Number of markers in the longest row." },
        "board.lattice.cols": { label: "Cols", hint: "Number of markers in each row." },
        "board.lattice.pitch_mm": {
            label: "Pitch",
            hint: "Center-to-center distance between adjacent markers in millimeters.",
        },
        "board.fiducials": {
            label: "Origin fiducials",
            hint: "Filled dots in the gaps around the first marker that fix the board's origin and orientation. Off for a board printed without them.",
        },
        "board.fiducials.dot_radius_mm": { label: "Dot radius" },
        "board.marker.outer_radius_mm": { label: "Outer radius", hint: "Radius of the outer ring in millimeters." },
        "board.marker.inner_radius_mm": { label: "Inner radius", hint: "Radius of the inner ring in millimeters." },
        "board.coding": {
            label: "Marker coding",
            hint: "Coded markers carry a 16-sector code band between the rings that identifies them; plain markers are labeled by lattice position instead.",
            enumLabels: { coded16: "Coded", plain: "Plain" },
        },
        "board.coding.ring_width_mm": {
            label: "Ring width",
            hint: "Stroke width of both concentric rings in millimeters.",
        },
        "board.coding.id_assignment": {
            label: "ID assignment",
            hint: "Optional list giving each marker's codebook ID in generation order. Leave empty for sequential IDs.",
        },
        "board.coding.codebook_profile": {
            label: "Codebook profile",
            hint: "Baseline: 893 codes, cyclic Hamming distance >= 2. Extended: 2180 codes, distance >= 1.",
            widget: "segmented",
            enumLabels: { base: "Baseline (893)", extended: "Extended (2180)" },
        },
        "config.marker_scale.diameter_min_px": { label: "Min diameter", hint: "Minimum expected marker diameter in pixels." },
        "config.marker_scale.diameter_max_px": { label: "Max diameter", hint: "Maximum expected marker diameter in pixels." },
        "config.advanced": {
            label: "Detection stages",
            hint: "Per-stage tuning knobs of the detector, each starting at the library's value.",
        },
        "config.advanced.proposal.grad_threshold": {
            label: "Gradient threshold",
            hint: "Minimum gradient magnitude for proposal voting. Lower detects weaker features.",
        },
        "config.advanced.decode.max_decode_dist": {
            label: "Max decode distance",
            hint: "Maximum Hamming distance for codebook matching.",
        },
        "config.advanced.decode.min_decode_confidence": {
            label: "Min confidence",
            hint: "Minimum confidence score for decode acceptance.",
        },
        "config.advanced.completion.enable": {
            label: "Marker completion",
            hint: "Attempt to recover missing markers using homography reprojection.",
            widget: "checkbox",
        },
        "config.self_undistort.enable": {
            label: "Self-undistort",
            hint: "Estimate and compensate for radial lens distortion during detection.",
            widget: "checkbox",
        },
        // Board metadata the detector does not read, and the fields the library derives from
        // the board itself when it loads a config (the schema marks them `readOnly`).
        ...hidden("board.schema", "board.name", ...readOnlyPaths(schema)),
        ...hidden(...hiddenPaths),
        ...hideContainers(schema, groups),
    },
};
