/** JSON-shaped values used in test fixtures and assertions. */
export type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;

export interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}
