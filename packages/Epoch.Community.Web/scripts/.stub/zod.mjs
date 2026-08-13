/*
 * Zod stub for the browser parser build.
 *
 * lang-core imports Zod at module top level, but `createStreamingParser` takes a
 * JSON schema and never reaches it — the library definition and prompt
 * generation that do use Zod run at build time, in Node. Bundling real Zod for
 * code the browser never executes would cost 649KB against a 49KB parser.
 *
 * Every export throws if it is ever called, so if a future version does reach
 * Zod at runtime this fails loudly instead of silently misbehaving.
 */
const nope = (name) => () => {
  throw new Error(`zod.${name} called in the browser: this build ships the JSON-schema parser only`);
};
export const object = nope("object");
export const string = nope("string");
export const number = nope("number");
export const boolean = nope("boolean");
export const array = nope("array");
export const any = nope("any");
export const enum_ = nope("enum");
export const toJSONSchema = nope("toJSONSchema");
export const $ZodObject = class {};
export const $ZodType = class {};
export const registry = nope("registry");
export const globalRegistry = { add: nope("globalRegistry.add"), get: () => undefined };
export const safeParse = nope("safeParse");
export const parse = nope("parse");
export default { object, string, number, boolean, array, any, toJSONSchema };
