import type { CommunityAuthorizationContext } from "./authorization";
import { CommunityError } from "./errors";
import { validateIsoDateTime, type CommunityFieldValue } from "./entity";
import type { CommunityObjectKind } from "./identity";

export type CommunityFieldType = "text" | "keyword" | "number" | "boolean" | "datetime" | "object-id" | "uri";
export type CommunityFieldOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "exists" | "term" | "phrase" | "prefix";

export interface CommunityFieldDefinition {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly type: CommunityFieldType;
  readonly operators: readonly CommunityFieldOperator[];
  readonly searchable: boolean;
  readonly sortable: boolean;
  readonly facetable: boolean;
  readonly sensitive: boolean;
  readonly description: string;
  readonly enumValues?: readonly string[];
  readonly defaultTextField?: boolean;
}

export interface CommunityFieldRegistry {
  readonly version: number;
  list(authorization: CommunityAuthorizationContext): readonly CommunityFieldDefinition[];
  resolve(name: string): CommunityFieldDefinition | undefined;
  validateValue<Value>(field: CommunityFieldDefinition, value: Value): CommunityFieldValue;
  suggest(name: string, authorization?: CommunityAuthorizationContext): readonly string[];
}

const KINDS: readonly CommunityObjectKind[] = [
  "message", "thread", "channel", "dm", "notification", "projection", "project",
  "issue", "change", "member", "agent", "artifact", "tombstone",
];
const NAME = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*$/u;
const SOURCE_NAME = /^[A-Za-z][A-Za-z0-9-]*\.[A-Za-z][A-Za-z0-9.-]*$/u;
const OBJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const ALL_OPERATORS = new Set<CommunityFieldOperator>(["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists", "term", "phrase", "prefix"]);
const OPERATORS_BY_TYPE: Readonly<Record<CommunityFieldType, ReadonlySet<CommunityFieldOperator>>> = Object.freeze({
  text: operatorSet("eq", "ne", "exists", "term", "phrase", "prefix"),
  keyword: operatorSet("eq", "ne", "in", "exists", "term", "prefix"),
  number: operatorSet("eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"),
  boolean: operatorSet("eq", "ne", "exists"),
  datetime: operatorSet("eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"),
  "object-id": operatorSet("eq", "ne", "in", "exists", "prefix"),
  uri: operatorSet("eq", "ne", "in", "exists", "prefix"),
});

export const CORE_COMMUNITY_FIELDS: readonly CommunityFieldDefinition[] = Object.freeze([
  field("text", ["q"], "text", ["eq", "ne", "exists", "term", "phrase", "prefix"], { searchable: true, defaultTextField: true }),
  field("objectId", ["id"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { sortable: true }),
  field("kind", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { sortable: true, facetable: true, enumValues: KINDS }),
  field("title", ["subject"], "text", ["eq", "ne", "exists", "term", "phrase", "prefix"], { searchable: true, sortable: true, defaultTextField: true }),
  field("body", [], "text", ["exists", "term", "phrase", "prefix"], { searchable: true, defaultTextField: true }),
  field("author", ["who", "handle"], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true, sortable: true, facetable: true }),
  field("state", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true, sortable: true, facetable: true }),
  field("visibility", [], "keyword", ["eq", "ne", "in", "exists"], { sortable: true, facetable: true, enumValues: ["private", "shared", "public"] }),
  field("createdAt", ["publishedAt"], "datetime", ["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"], { sortable: true }),
  field("updatedAt", [], "datetime", ["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"], { sortable: true }),
  field("score", [], "number", ["eq", "ne", "lt", "lte", "gt", "gte", "in", "exists"], { sortable: true }),
  field("contextId", [], "object-id", ["eq", "ne", "in", "exists", "prefix"], { sortable: true }),
  field("channelId", ["channel"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true }),
  field("dmId", ["dm"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true, sensitive: true }),
  field("projectId", ["project"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true }),
  field("spaceId", ["space"], "object-id", ["eq", "ne", "in", "exists", "prefix"], { facetable: true }),
  field("parentId", ["re", "parent"], "object-id", ["eq", "ne", "in", "exists"], {}),
  field("has", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true }),
  field("owner", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true }),
  field("uri", [], "uri", ["eq", "ne", "in", "exists", "prefix"], {}),
  field("tombstone", [], "boolean", ["eq", "ne", "exists"], { facetable: true }),
  field("aliases", [], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { searchable: true }),
  field("reactions", ["react", "reaction"], "keyword", ["eq", "ne", "in", "exists", "term", "prefix"], { facetable: true }),
  field("participantIds", [], "object-id", ["eq", "ne", "in", "exists"], { sensitive: true }),
]);

export function createCommunityFieldRegistry(
  sourceDefinitions: readonly CommunityFieldDefinition[] = [],
  version = 1,
): CommunityFieldRegistry {
  if (!Number.isSafeInteger(version) || version < 1) throw new CommunityError("INVALID_FIELD", "Field registry version must be a positive integer");
  const definitions = [
    ...CORE_COMMUNITY_FIELDS.map((definition) => validateDefinition(definition, false)),
    ...sourceDefinitions.map((definition) => validateDefinition(definition, true)),
  ];
  const byName = new Map<string, CommunityFieldDefinition>();
  const register = (key: string, definition: CommunityFieldDefinition): void => {
    const normalized = key.toLocaleLowerCase("en-US");
    if (byName.has(normalized)) throw new CommunityError("INVALID_FIELD", `Duplicate community field or alias: ${key}`);
    byName.set(normalized, definition);
  };
  for (const definition of definitions) {
    register(definition.name, definition);
    for (const alias of definition.aliases) register(alias, definition);
  }
  const ordered = Object.freeze([...new Set(byName.values())].sort((left, right) => left.name.localeCompare(right.name, "en")));
  return Object.freeze({
    version,
    list: (authorization: CommunityAuthorizationContext) => Object.freeze(ordered.filter((definition) =>
      !definition.sensitive || hasSensitiveFieldPermission(authorization))),
    resolve: (name: string) => byName.get(name.toLocaleLowerCase("en-US")),
    validateValue,
    suggest: (name: string, authorization: CommunityAuthorizationContext = {}) => suggestions(
      name,
      ordered.filter((definition) => !definition.sensitive || hasSensitiveFieldPermission(authorization)),
    ),
  });
}

function field(
  name: string,
  aliases: readonly string[],
  type: CommunityFieldType,
  operators: readonly CommunityFieldOperator[],
  options: Partial<Pick<CommunityFieldDefinition, "searchable" | "sortable" | "facetable" | "sensitive" | "enumValues" | "defaultTextField">>,
): CommunityFieldDefinition {
  const definition: CommunityFieldDefinition = {
    name,
    aliases: Object.freeze([...aliases]),
    type,
    operators: Object.freeze([...operators]),
    searchable: options.searchable ?? false,
    sortable: options.sortable ?? false,
    facetable: options.facetable ?? false,
    sensitive: options.sensitive ?? false,
    description: `Canonical ${name} field.`,
  };
  if (options.enumValues !== undefined) Object.assign(definition, { enumValues: Object.freeze([...options.enumValues]) });
  if (options.defaultTextField !== undefined) Object.assign(definition, { defaultTextField: options.defaultTextField });
  return Object.freeze(definition);
}

function validateDefinition(input: CommunityFieldDefinition, source: boolean): CommunityFieldDefinition {
  if (!NAME.test(input.name)) throw new CommunityError("INVALID_FIELD", "Community field name is invalid");
  if (source && !SOURCE_NAME.test(input.name)) throw new CommunityError("INVALID_FIELD", "Source-contributed fields must use a namespaced name");
  if (!Array.isArray(input.aliases) || input.aliases.some((alias) => !NAME.test(alias))) throw new CommunityError("INVALID_FIELD", `Aliases for ${input.name} are invalid`);
  if (!Array.isArray(input.operators) || input.operators.length === 0 || input.operators.some((operator) => !ALL_OPERATORS.has(operator))) {
    throw new CommunityError("INVALID_FIELD", `Operators for ${input.name} are invalid`);
  }
  if (input.operators.some((operator) => !OPERATORS_BY_TYPE[input.type]?.has(operator))) {
    throw new CommunityError("INVALID_FIELD", `Operators for ${input.name} are incompatible with ${input.type}`);
  }
  if (input.description.length === 0 || input.description.length > 1024) throw new CommunityError("INVALID_FIELD", `Description for ${input.name} is invalid`);
  if (input.enumValues?.some((value) => value.length === 0 || value.length > 512) === true) {
    throw new CommunityError("INVALID_FIELD", `Enum values for ${input.name} are invalid`);
  }
  const definition: CommunityFieldDefinition = {
    ...input,
    aliases: Object.freeze([...input.aliases]),
    operators: Object.freeze([...new Set(input.operators)]),
  };
  if (input.enumValues !== undefined) Object.assign(definition, { enumValues: Object.freeze([...new Set(input.enumValues)]) });
  return Object.freeze(definition);
}

function validateValue<Value>(fieldDefinition: CommunityFieldDefinition, value: Value): CommunityFieldValue {
  const values = Array.isArray(value) ? value : [value];
  if (values.length > 4096) throw invalidValue(fieldDefinition, "contains too many values");
  const validated = values.map((candidate) => validateScalar(fieldDefinition, candidate));
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  return Object.freeze(Array.isArray(value) ? validated : validated[0]) as CommunityFieldValue;
}

function validateScalar<Value>(fieldDefinition: CommunityFieldDefinition, value: Value): string | number | boolean | null {
  if (value === null) return null;
  let result: string | number | boolean;
  switch (fieldDefinition.type) {
    case "number":
      if (!isNumber(value) || !Number.isFinite(value)) throw invalidValue(fieldDefinition, "must be a finite number");
      result = value;
      break;
    case "boolean":
      if (!isBoolean(value)) throw invalidValue(fieldDefinition, "must be a boolean");
      result = value;
      break;
    case "datetime":
      try { result = validateIsoDateTime(value, fieldDefinition.name); }
      catch { throw invalidValue(fieldDefinition, "must be a datetime with an explicit timezone"); }
      break;
    case "object-id":
      if (!isString(value) || !OBJECT_ID.test(value)) throw invalidValue(fieldDefinition, "must be an opaque object ID");
      result = value;
      break;
    case "uri":
      if (!isString(value)) throw invalidValue(fieldDefinition, "must be a URI");
      try { new URL(value); } catch { throw invalidValue(fieldDefinition, "must be an absolute URI"); }
      result = value;
      break;
    case "keyword": case "text":
      if (!isString(value) || value.length > 1_000_000) throw invalidValue(fieldDefinition, "must be a bounded string");
      result = value.normalize("NFC");
      break;
  }
  if (fieldDefinition.enumValues !== undefined && isString(result) && !fieldDefinition.enumValues.includes(result)) {
    throw invalidValue(fieldDefinition, `must be one of ${fieldDefinition.enumValues.join(", ")}`);
  }
  return result;
}

function isString<Value>(value: Value): value is Value & string { return typeof value === "string"; }
function isNumber<Value>(value: Value): value is Value & number { return typeof value === "number"; }
function isBoolean<Value>(value: Value): value is Value & boolean { return typeof value === "boolean"; }

function suggestions(input: string, definitions: readonly CommunityFieldDefinition[]): readonly string[] {
  const needle = input.toLocaleLowerCase("en-US");
  return Object.freeze(definitions
    .map((definition) => ({ definition, distance: Math.min(...[definition.name, ...definition.aliases]
      .map((candidate) => editDistance(needle, candidate.toLocaleLowerCase("en-US")))) }))
    .sort((left, right) => left.distance - right.distance || left.definition.name.localeCompare(right.definition.name, "en"))
    .slice(0, 3)
    .map(({ definition }) => definition.name));
}

function editDistance(left: string, right: string): number {
  const row = [...Array(right.length + 1).keys()];
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j] ?? 0;
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = old;
    }
  }
  return row[right.length] ?? Number.MAX_SAFE_INTEGER;
}

function hasSensitiveFieldPermission(authorization: CommunityAuthorizationContext): boolean {
  // SAFETY: The surrounding validation and domain contract establish the asserted type.
  return (authorization.permissions as readonly string[] | undefined)?.includes("field:sensitive:read") === true;
}

function invalidValue(fieldDefinition: CommunityFieldDefinition, reason: string): CommunityError {
  return new CommunityError("INVALID_FIELD", `${fieldDefinition.name} ${reason}`);
}

function operatorSet(...operators: CommunityFieldOperator[]): ReadonlySet<CommunityFieldOperator> {
  return new Set(operators);
}
