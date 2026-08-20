/**
 * Type-predicate helpers for test code. anti-slop allows `typeof` inside
 * predicates (`allowInTypeGuards`); call sites should use these instead of
 * ad hoc `typeof` checks.
 */
export function isString<T>(value: T): value is T & string {
  return typeof value === "string";
}

export function isNumber<T>(value: T): value is T & number {
  return typeof value === "number";
}

export function isBoolean<T>(value: T): value is T & boolean {
  return typeof value === "boolean";
}

export function isBigint<T>(value: T): value is T & bigint {
  return typeof value === "bigint";
}

export function isSymbol<T>(value: T): value is T & symbol {
  return typeof value === "symbol";
}

export function isUndefined<T>(value: T): value is T & undefined {
  return typeof value === "undefined";
}

export function isFunction<T>(value: T): value is T & ((...args: never[]) => void) {
  return typeof value === "function";
}

export function isObjectNonNull<T>(value: T): value is T & object {
  return typeof value === "object" && value !== null;
}
