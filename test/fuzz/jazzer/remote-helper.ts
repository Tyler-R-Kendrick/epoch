import { fuzzSafeRemoteHelper } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeRemoteHelper(data.toString("utf8"));
}
