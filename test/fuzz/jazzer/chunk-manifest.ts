import { fuzzSafeChunkManifestJson } from "../oracles/parsers";

export function fuzz(data: Buffer): void {
  fuzzSafeChunkManifestJson(data.toString("utf8"));
}
