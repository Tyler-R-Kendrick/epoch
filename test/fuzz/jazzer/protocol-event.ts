import { fuzzSafeProtocolEventJson } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeProtocolEventJson(data.toString("utf8"));
}
