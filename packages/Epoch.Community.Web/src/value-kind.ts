/** Representation guards used only at parsing and platform boundaries. */
export function isString<T>(value: T): value is T & string {
  return typeof value === "string";
}

export function isNumber<T>(value: T): value is T & number {
  return typeof value === "number";
}

export function isBoolean<T>(value: T): value is T & boolean {
  return typeof value === "boolean";
}

export function isFunction<T>(value: T): value is T & CallableFunction {
  return typeof value === "function";
}

export function isObject<T>(value: T): value is T & object {
  return typeof value === "object" && value !== null;
}

export function isUndefined<T>(value: T): value is T & undefined {
  return typeof value === "undefined";
}
