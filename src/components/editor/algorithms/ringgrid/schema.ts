import detectConfig from "@vitavision/ringgrid/schemas/detect_config.json";
import targetSpec from "@vitavision/ringgrid/schemas/target_spec.json";

import { asSchema, composeSchema } from "../schemaTools";

export const schema = composeSchema("Ring grid", {
    board: asSchema(targetSpec),
    config: asSchema(detectConfig),
});
