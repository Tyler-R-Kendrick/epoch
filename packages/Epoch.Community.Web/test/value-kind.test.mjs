import assert from "node:assert/strict";
import test from "node:test";

await import("../app/value-kind.js");

const kinds = globalThis.CW_VALUE;

test("classifies JavaScript values without coercing boundary data", () => {
  assert.equal(kinds.isString("epoch"), true);
  assert.equal(kinds.isString(42), false);
  assert.equal(kinds.isNumber(Number.NaN), true);
  assert.equal(kinds.isBoolean(false), true);
  assert.equal(kinds.isFunction(() => undefined), true);
  assert.equal(kinds.isObject({}), true);
  assert.equal(kinds.isObject([]), true);
  assert.equal(kinds.isObject(null), false);
  assert.equal(kinds.isUndefined(undefined), true);
});
