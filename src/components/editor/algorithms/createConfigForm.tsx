import { SchemaValueForm, type JsonSchema, type RenderField, type UiSchema } from "@vitavision/forms";
import type { ComponentType } from "react";

import type { AlgorithmConfigFormProps } from "./types";

/**
 * The config form of an algorithm: its package's JSON Schema rendered by `SchemaValueForm`.
 *
 * The editor rail hands every algorithm the same four props; this binds them to the
 * algorithm's schema and its `UiSchema` (the grouping, labels and units the schema cannot
 * carry). One column in the rail, two in the roomier configuration dialog (`modal`).
 * `renderField` is the escape hatch for a field no `UiSchema` entry can express.
 */
export function createConfigForm(options: {
    schema: JsonSchema;
    ui: UiSchema;
    renderField?: RenderField;
}): ComponentType<AlgorithmConfigFormProps<unknown>> {
    const { schema, ui, renderField } = options;

    function SchemaConfigForm({ config, onChange, disabled, modal }: AlgorithmConfigFormProps<unknown>) {
        return (
            <SchemaValueForm
                schema={schema}
                value={config}
                onValueChange={onChange}
                ui={ui}
                columns={modal ? 2 : 1}
                disabled={disabled}
                renderField={renderField}
            />
        );
    }
    return SchemaConfigForm;
}
