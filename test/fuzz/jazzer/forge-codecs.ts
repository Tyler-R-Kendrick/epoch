import { fuzzSafeForgeCodecBytes } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeForgeCodecBytes(data);
}
