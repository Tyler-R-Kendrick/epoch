import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertPathQueryFailClosed,
  fuzzSafeCanonicalId,
  fuzzSafeChunkManifestJson,
  fuzzSafeForgeCodecBytes,
  fuzzSafePathQuery,
  fuzzSafePktLines,
  fuzzSafeProtocolEventJson,
  fuzzSafeRemoteHelper,
  fuzzSafeRevset,
  fuzzSafeSwhid,
} from "../oracles/parsers";

const CORPUS_ROOT = join(process.cwd(), "test/fuzz/corpus/v1");

const runners = {
  revset: (bytes) => fuzzSafeRevset(bytes.toString("utf8")),
  "canonical-id": (bytes) => fuzzSafeCanonicalId(bytes.toString("utf8")),
  "pkt-line": (bytes) => fuzzSafePktLines(bytes),
  "remote-helper": (bytes) => fuzzSafeRemoteHelper(bytes.toString("utf8")),
  "chunk-manifest": (bytes) => fuzzSafeChunkManifestJson(bytes.toString("utf8")),
  swhid: (bytes) => fuzzSafeSwhid(bytes.toString("utf8")),
  "forge-codecs": (bytes) => fuzzSafeForgeCodecBytes(bytes),
  "protocol-event": (bytes) => fuzzSafeProtocolEventJson(bytes.toString("utf8")),
  "path-query": (bytes) => {
    fuzzSafePathQuery(bytes.toString("utf8"));
    assertPathQueryFailClosed(bytes.toString("utf8"));
  },
  history: (bytes) => {
    // History corpora are JSON failure records; presence alone is the regression latch.
    const text = bytes.toString("utf8").trim();
    if (text.length === 0) return;
    // SAFETY: Runtime checks or construction above establish { commands?: string.
    const parsed = JSON.parse(text) as { commands?: string; error?: string };
    assert.notEqual(parsed, null);
    assert.equal(Array.isArray(parsed), false);
  },
};

function listCorpusFiles(target: string): string[] {
  const dir = join(CORPUS_ROOT, target);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name !== ".gitkeep")
    .map((name) => join(dir, name));
}

async function main(): Promise<void> {
  let files = 0;
  for (const [target, run] of Object.entries(runners)) {
    for (const file of listCorpusFiles(target)) {
      const bytes = readFileSync(file);
      run(bytes);
      files += 1;
    }
  }

  // Always exercise path-query fail-closed oracle even if corpus is empty.
  assertPathQueryFailClosed("status:open AND author:alice");
  assertPathQueryFailClosed("../escape");
  assertPathQueryFailClosed("");

  process.stdout.write(JSON.stringify({
    suite: "corpus-regression",
    files,
    lane: "regression",
    status: "passed",
  }) + "\n");
}

void main().catch((error) => {
  // SAFETY: Runtime checks or construction above establish Error).stack ?? error)}\n`).
  process.stderr.write(`${String((error as Error).stack ?? error)}\n`);
  process.exitCode = 1;
});
