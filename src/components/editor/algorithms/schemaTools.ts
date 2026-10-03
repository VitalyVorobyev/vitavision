import { resolveSchema, shapeOf, type FieldUi, type JsonSchema, type SchemaShape, type UiGroup } from "@vitavision/forms";

/*
 * Small helpers that turn the JSON Schemas the WASM packages ship into what
 * `SchemaValueForm` takes: one root schema per algorithm, and the `hidden`
 * entries for the fields the library derives itself.
 */

/** A schema imported from a package's `schemas/*.json`, as the form's loose schema type. */
export const asSchema = (imported: unknown): JsonSchema => imported as JsonSchema;

const joinPath = (...parts: string[]): string => parts.filter((part) => part !== "").join(".");

const REF = /^#\/(\$defs|definitions)\//;

/** Clone a schema, pointing every same-document `$ref` into `$defs` at `<prefix>_<name>`. */
function reprefix(node: unknown, prefix: string): unknown {
    if (Array.isArray(node)) return node.map((item) => reprefix(item, prefix));
    if (node === null || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === "$ref" && typeof value === "string" && REF.test(value)) {
            out[key] = value.replace(REF, `#/$defs/${prefix}_`);
        } else if (key === "$defs" || key === "definitions") {
            continue;
        } else {
            out[key] = reprefix(value, prefix);
        }
    }
    return out;
}

const rank = (order: string[], key: string): number => {
    const index = order.indexOf(key);
    return index === -1 ? order.length : index;
};

/**
 * Inline a `$ref` that has `properties` written beside it.
 *
 * ringgrid's target spec writes an internally tagged variant as the struct it flattens plus
 * the discriminator: `{ "$ref": "#/$defs/HexGeometry", "properties": { "kind": { "const": "hex" } } }`.
 * Both apply (that is JSON Schema), but a form that follows the `$ref` and then looks at
 * `properties` sees only the discriminator and none of the struct's fields. Folding the two
 * into one object schema, discriminator first, gives it the shape every other tagged union
 * in these schemas has.
 */
function inlineSiblingProperties(node: unknown, defs: Record<string, JsonSchema>): unknown {
    if (Array.isArray(node)) return node.map((item) => inlineSiblingProperties(item, defs));
    if (node === null || typeof node !== "object") return node;
    const record = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        out[key] = key === "$defs" || key === "definitions" ? value : inlineSiblingProperties(value, defs);
    }
    const ref = out.$ref;
    if (typeof ref === "string" && REF.test(ref) && typeof out.properties === "object" && out.properties !== null) {
        const target = defs[ref.replace(REF, "")];
        if (target === undefined) return out;
        const { $ref: _ref, properties, required, ...own } = out;
        const targetRequired = target.required ?? [];
        // The schema files list properties alphabetically; `required` keeps the struct's
        // declaration order, which is the order a reader expects the fields in.
        const declared = Object.fromEntries(
            Object.entries(target.properties ?? {}).sort(
                ([a], [b]) => rank(targetRequired, a) - rank(targetRequired, b) || a.localeCompare(b),
            ),
        );
        return {
            ...target,
            ...own,
            properties: { ...properties, ...declared },
            required: [...new Set([...((required as string[] | undefined) ?? []), ...targetRequired])],
        };
    }
    return out;
}

/**
 * One root schema for a config that is several package documents side by side.
 *
 * Each part's root becomes `$defs[<key>]` and its own `$defs` entries move to
 * `$defs[<key>_<name>]` (their `$ref`s rewritten with them), so two packages' type names
 * cannot collide. The result is an object with one required property per part, plus
 * `extra` properties the app adds around them (ringgrid's board and config; radsym's
 * proposal algorithm and config).
 */
export function composeSchema(
    title: string,
    parts: Record<string, JsonSchema>,
    extra: Record<string, JsonSchema> = {},
): JsonSchema {
    const defs: Record<string, JsonSchema> = {};
    const properties: Record<string, JsonSchema> = { ...extra };
    for (const [key, part] of Object.entries(parts)) {
        const { $defs, definitions, $schema: _ignored, ...root } = part as JsonSchema & { $schema?: string };
        const own: Record<string, JsonSchema> = { ...definitions, ...$defs };
        for (const [name, def] of Object.entries(own)) {
            defs[`${key}_${name}`] = reprefix(inlineSiblingProperties(def, own), key) as JsonSchema;
        }
        defs[key] = reprefix(inlineSiblingProperties(root, own), key) as JsonSchema;
        properties[key] = { $ref: `#/$defs/${key}`, ...(part.description === undefined ? {} : { description: part.description }) };
    }
    return {
        type: "object",
        title,
        properties,
        required: Object.keys(parts),
        $defs: defs,
    };
}

/**
 * Walk every field of a schema the way the form lists them: an object's fields, every
 * variant of an internally tagged union (without its discriminator), and the payload of every
 * variant of an externally tagged one (`upscale.fixed`). A tuple or a leaf is not descended
 * into. `visit` gets the dot path, the node as written and its resolved shape; returning
 * `false` skips the node's children.
 */
export function walkFields(
    schema: JsonSchema,
    visit: (path: string, node: JsonSchema, shape: SchemaShape) => boolean | void,
): void {
    const walk = (node: JsonSchema, path: string, depth: number): void => {
        if (depth > 16) return;
        const shape = shapeOf(node, schema);
        if (path !== "" && visit(path, node, shape) === false) return;
        if (shape.kind === "object") {
            for (const field of shape.fields) walk(field.schema, joinPath(path, field.key), depth + 1);
        } else if (shape.kind === "tagged") {
            for (const variant of shape.variants) {
                for (const field of variant.fields) walk(field.schema, joinPath(path, field.key), depth + 1);
            }
        } else if (shape.kind === "external") {
            for (const variant of shape.variants) {
                if (variant.payload !== undefined) walk(variant.payload, joinPath(path, variant.tag), depth + 1);
            }
        }
    };
    walk(schema, "", 0);
}

/**
 * The dot paths of every field the schema marks `readOnly`: values the library derives from
 * other fields when it loads a config (a ring-grid detector re-derives them from the board),
 * so editing one has no effect.
 */
export function readOnlyPaths(schema: JsonSchema): string[] {
    const found: string[] = [];
    walkFields(schema, (path, node) => {
        const flagged = (candidate: JsonSchema) => (candidate as { readOnly?: boolean }).readOnly === true;
        if (!flagged(node) && !flagged(resolveSchema(node, schema).schema)) return true;
        found.push(path);
        return false;
    });
    return found;
}

/**
 * Hide the top-level containers no group lists as a whole.
 *
 * The groups of these forms list leaves (`board.rows`, `chess.threshold`), and a leaf is
 * drawn by its group. The form also walks the object that holds the leaf, and for an object
 * whose fields are all spoken for it still draws an empty frame. Hiding the container (a
 * `hidden` entry on its own path, which leaves its grouped leaves alone) stops that. Whether
 * every field the schema has is accounted for is checked by the algorithms' tests, not here.
 */
export function hideContainers(schema: JsonSchema, groups: UiGroup[]): Record<string, FieldUi> {
    const listed = new Set(groups.flatMap((group) => group.fields));
    return hidden(...Object.keys(schema.properties ?? {}).filter((key) => !listed.has(key)));
}

/** `{ hidden: true }` for each path, as the `fields` table of a `UiSchema`. */
export function hidden(...paths: string[]): Record<string, FieldUi> {
    return Object.fromEntries(paths.map((path) => [path, { hidden: true } satisfies FieldUi]));
}
