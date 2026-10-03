import type { UiGroup, UiSchema } from "@vitavision/forms";

import {
    chessDetectorFields,
    chessDetectorHidden,
    chessDetectorPaths,
    chessboardFields,
    chessboardKnobPaths,
    chessboardTuningPath,
} from "../../chessDetectorUi";
import { hidden, hideContainers } from "../../schemaTools";
import { schema } from "./schema";

const groups: UiGroup[] = [
    { id: "chessboard", title: "Chessboard detector", fields: chessboardKnobPaths("params") },
    { id: "corners", title: "Corner detector", collapsible: true, fields: chessDetectorPaths("chess") },
    { id: "advanced", title: "Advanced", collapsible: true, fields: [chessboardTuningPath("params")] },
];

/** Fields deliberately not offered; the schema's other fields are all in a group. */
export const hiddenPaths: string[] = [...chessDetectorHidden("chess")];

export const ui: UiSchema = {
    groups,
    fields: {
        ...chessboardFields("params"),
        ...chessDetectorFields("chess"),
        ...hidden(...hiddenPaths),
        ...hideContainers(schema, groups),
    },
};
