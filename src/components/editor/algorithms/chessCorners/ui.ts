import type { UiGroup, UiSchema } from "@vitavision/forms";

import {
    chessAdvancedPaths,
    chessDetectionPaths,
    chessDetectorFields,
    chessDetectorHidden,
    chessPyramidPath,
} from "../chessDetectorUi";
import { hidden, hideContainers } from "../schemaTools";
import { schema } from "./schema";

const groups: UiGroup[] = [
    { id: "detection", title: "Detection", fields: chessDetectionPaths("") },
    { id: "pyramid", title: "Pyramid", collapsible: true, fields: [chessPyramidPath("")] },
    { id: "advanced", title: "Advanced", collapsible: true, fields: chessAdvancedPaths("") },
];

/** Fields deliberately not offered; the schema's other fields are all in a group. */
export const hiddenPaths: string[] = [...chessDetectorHidden("")];

export const ui: UiSchema = {
    groups,
    fields: { ...chessDetectorFields(""), ...hidden(...hiddenPaths), ...hideContainers(schema, groups) },
};
