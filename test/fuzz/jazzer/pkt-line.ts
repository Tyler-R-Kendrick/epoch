import { fuzzSafePktLines } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafePktLines(data);
}
