/** JSON values accepted at harness file and process boundaries. */
export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

/** Representation checks live in predicates so callers branch on named contracts. */
export function isBoolean<T>(value: T): value is T & boolean {
	return typeof value === "boolean";
}

export function isNumber<T>(value: T): value is T & number {
	return typeof value === "number";
}

export function isString<T>(value: T): value is T & string {
	return typeof value === "string";
}

export function isObject<T>(value: T): value is T & object {
	return value !== null && typeof value === "object";
}

export function isJsonObject<T>(value: T): value is T & JsonObject {
	return isObject(value) && !Array.isArray(value);
}

export function parseStringArray<T>(value: T): string[] {
	return Array.isArray(value) ? value.filter(isString) : [];
}
