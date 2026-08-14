import { fuzzSafePathQuery } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafePathQuery(data.toString("utf8"));
}
