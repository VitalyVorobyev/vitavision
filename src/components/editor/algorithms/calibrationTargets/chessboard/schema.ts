import chessConfig from "@vitavision/calib-targets/schemas/chess_config.json";
import chessboardParams from "@vitavision/calib-targets/schemas/chessboard_params.json";

import { asSchema, composeSchema } from "../../schemaTools";

export const schema = composeSchema("Chessboard", {
    chess: asSchema(chessConfig),
    params: asSchema(chessboardParams),
});
