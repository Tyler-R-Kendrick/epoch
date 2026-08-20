export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

export function isRecord<Value>(value: Value): value is Value & JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function canonicalJson<Value>(value: Value): string {
  return JSON.stringify(sortJson(value));
}

export function sortJson<Value>(value: Value): Value {
  if (Array.isArray(value)) {
    // SAFETY: Mapping only recursively reorders object keys, preserving the array's value contract.
    return value.map(sortJson) as Value;
  }

  if (isRecord(value)) {
    const sorted: JsonObject = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item !== undefined) sorted[key] = sortJson(item);
    }
    // SAFETY: The result has the same keys and recursively equivalent values as the input object.
    return sorted as Value;
  }

  return value;
}
