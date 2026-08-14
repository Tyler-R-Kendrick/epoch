import { fuzzSafeSwhid } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeSwhid(data.toString("utf8"));
}
