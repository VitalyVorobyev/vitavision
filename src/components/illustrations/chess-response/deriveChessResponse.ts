import { computeChessResponse, describePatternResponse, responseStatus } from "./math";
import type { ChessResponseControls } from "./types";

export function deriveChessResponse(controls: ChessResponseControls) {
    const computation = computeChessResponse(controls);

    return {
        ...computation,
        explanation: describePatternResponse(controls),
        status: responseStatus(computation.response),
    };
}
