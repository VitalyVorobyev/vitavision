import type { UiGroup } from "@vitavision/forms";

import {
    boardUi,
    chessDetectorPaths,
    chessboardKnobPaths,
    chessboardTuningPath,
} from "../../chessDetectorUi";
import { schema } from "./schema";

const groups: UiGroup[] = [
    { id: "chessboard", title: "Chessboard detector", fields: chessboardKnobPaths("params") },
    { id: "corners", title: "Corner detector", collapsible: true, fields: chessDetectorPaths("chess") },
    { id: "advanced", title: "Advanced", collapsible: true, fields: [chessboardTuningPath("params")] },
];

export const { hiddenPaths, ui } = boardUi({ schema, groups, chessboardPrefix: "params", fields: {} });
