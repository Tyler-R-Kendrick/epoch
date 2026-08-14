import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fuzzSafeForgeCodecBytes, fuzzSafeSwhid } from "../oracles/parsers";

/** Minimized Jazzer crashers — expected invalid input must not escape the oracle. */
export function run(): void {
  const swhid = readFileSync(join(process.cwd(), "test/fuzz/corpus/v1/swhid/crash-trailing-semicolon"));
  const forge = readFileSync(join(process.cwd(), "test/fuzz/corpus/v1/forge-codecs/crash-digit-two"));
  assert.doesNotThrow(() => fuzzSafeSwhid(swhid.toString("utf8")));
  assert.doesNotThrow(() => fuzzSafeForgeCodecBytes(forge));
  process.stdout.write(JSON.stringify({
    regression: "jazzer-swhid-forge-malformed",
    swhidBytes: swhid.length,
    forgeBytes: forge.length,
    status: "passed",
  }) + "\n");
}

void run();
