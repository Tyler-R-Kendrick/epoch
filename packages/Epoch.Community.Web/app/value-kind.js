/**
 * Boundary value classifiers shared by the classic browser scripts.
 *
 * These functions classify JavaScript representations without coercing input.
 * Callers still own schema parsing for domain values.
 */
(function installValueKind(global) {
  "use strict";

  var objectTag = function (value) {
    return Object.prototype.toString.call(value);
  };
  var isPrimitiveWithTag = function (value, tag) {
    return Object(value) !== value && objectTag(value) === tag;
  };
  var functionTags = new Set([
    "[object Function]",
    "[object AsyncFunction]",
    "[object GeneratorFunction]",
    "[object AsyncGeneratorFunction]",
  ]);

  global.CW_VALUE = Object.freeze({
    isString: function (value) {
      return isPrimitiveWithTag(value, "[object String]");
    },
    isNumber: function (value) {
      return isPrimitiveWithTag(value, "[object Number]");
    },
    isBoolean: function (value) {
      return value === true || value === false;
    },
    isBigInt: function (value) {
      return isPrimitiveWithTag(value, "[object BigInt]");
    },
    isSymbol: function (value) {
      return isPrimitiveWithTag(value, "[object Symbol]");
    },
    isFunction: function (value) {
      return functionTags.has(objectTag(value));
    },
    isObject: function (value) {
      return value !== null && Object(value) === value && !functionTags.has(objectTag(value));
    },
    isUndefined: function (value) {
      return value === undefined;
    },
  });
}(globalThis));
