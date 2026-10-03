import type { UiGroup, UiSchema } from "@vitavision/forms";

import { hidden, hideContainers } from "../schemaTools";
import { schema } from "./schema";

const groups: UiGroup[] = [
    { id: "algorithm", title: "Response algorithm", fields: ["algorithm"] },
    { id: "radius", title: "Radius range", fields: ["config.radii"] },
    {
        id: "detection",
        title: "Detection",
        fields: [
            "config.advanced.frst.alpha",
            "config.advanced.frst.gradient_threshold",
            "config.advanced.frst.smoothing_factor",
            "config.polarity",
        ],
    },
    {
        id: "post",
        title: "Post-processing",
        fields: [
            "config.advanced.nms.radius",
            "config.advanced.nms.threshold",
            "config.advanced.nms.max_detections",
            "config.gradient_operator",
        ],
    },
];

/**
 * Fields deliberately not offered; the schema's other fields are all in a group. The editor
 * runs the proposal stage (`extract_proposals`) only. These fields belong to the later
 * stages of a full circle detection (support scoring, refinement, region of interest) and
 * have no effect on a proposal run; verified by changing each and comparing the proposals.
 */
export const hiddenPaths: string[] = [
    "config.radius_hint",
    "config.min_score",
    "config.roi",
    "config.advanced.scoring",
    "config.advanced.refinement",
];

export const ui: UiSchema = {
    groups,
    fields: {
        algorithm: {
            label: "Algorithm",
            hint: "Voting algorithm for the response map. FRST uses orientation; RSD uses magnitude only (~2× faster).",
            widget: "select",
            enumLabels: {
                frst: "FRST (multi-radius)",
                frst_fused: "FRST fused (faster)",
                rsd: "RSD (magnitude-only)",
                rsd_fused: "RSD fused (fastest)",
            },
        },
        "config.radii": { span: 2 },
        "config.advanced.frst.alpha": {
            label: "Alpha",
            hint: "Radial strictness exponent. Higher = stricter radial symmetry. Only affects FRST.",
        },
        "config.advanced.frst.gradient_threshold": {
            label: "Gradient threshold",
            hint: "Minimum gradient magnitude to cast votes. 0 = no threshold.",
        },
        "config.advanced.frst.smoothing_factor": {
            label: "Smoothing",
            hint: "Gaussian smoothing factor (kn). Higher = smoother vote maps.",
        },
        "config.polarity": {
            label: "Polarity",
            hint: "Detect bright centers, dark centers, or both.",
            widget: "segmented",
        },
        "config.advanced.nms.radius": { label: "NMS radius", hint: "Non-maximum suppression radius in pixels." },
        "config.advanced.nms.threshold": {
            label: "NMS threshold",
            hint: "Minimum score to keep after NMS. 0 = keep all.",
        },
        "config.advanced.nms.max_detections": {
            label: "Max proposals",
            hint: "Maximum number of proposals to return.",
        },
        "config.gradient_operator": {
            label: "Gradient",
            hint: "Gradient operator for edge detection.",
            widget: "segmented",
        },
        ...hidden(...hiddenPaths),
        ...hideContainers(schema, groups),
    },
};
