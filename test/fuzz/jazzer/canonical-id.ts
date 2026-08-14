import { fuzzSafeCanonicalId } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeCanonicalId(data.toString("utf8"));
}
