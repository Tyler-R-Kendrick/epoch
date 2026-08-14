import { fuzzSafeRevset } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeRevset(data.toString("utf8"));
}
