import { computeChessResponse, describePatternResponse, responseStatus } from "./math";
import type { ChessResponseControls } from "./types";

export function useChessResponse(controls: ChessResponseControls) {
    const computation = computeChessResponse(controls);

    return {
        ...computation,
        explanation: describePatternResponse(controls),
        status: responseStatus(computation.response),
    };
}
