import detectorConfig from "@vitavision/chess-corners/schemas/detector_config.json";

import { asSchema } from "../schemaTools";

export const schema = asSchema(detectorConfig);
