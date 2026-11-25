import detectCirclesConfig from "@vitavision/radsym/schemas/detect_circles_config.json";

import { asSchema, composeSchema } from "../schemaTools";

/** The proposal algorithms `extract_proposals` / `response_heatmap` accept, in the order the form lists them. */
const algorithm = asSchema({
    title: "Algorithm",
    description: "Voting algorithm for the response map. FRST uses orientation; RSD uses magnitude only (~2× faster).",
    type: "string",
    default: "frst",
    oneOf: [
        { const: "frst", type: "string", description: "Fast radial symmetry transform: one vote map per radius." },
        { const: "frst_fused", type: "string", description: "FRST with the radii fused into one pass: faster." },
        { const: "rsd", type: "string", description: "Radial symmetry from gradient magnitude only." },
        { const: "rsd_fused", type: "string", description: "RSD with the radii fused into one pass: the fastest." },
    ],
});

export const schema = composeSchema("Radial symmetry", { config: asSchema(detectCirclesConfig) }, { algorithm });
