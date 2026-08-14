import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import { SignedChangeGraphStore } from "@epoch/core";
import { longFcParams, shortFcParams } from "../arbitraries/parsers";
import { historyCommands, emptyModel } from "./commands";
import { storeCanonicalDigest, type HistoryReal } from "./model";

function deterministicRandom(seed: number): (byteLength: number) => Uint8Array {
  let counter = 0;
  return (byteLength: number) => {
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    while (offset < byteLength) {
      counter += 1;
      const block = createHash("sha256").update(`${seed}:${counter}`).digest();
      bytes.set(block.subarray(0, Math.min(block.length, byteLength - offset)), offset);
      offset += block.length;
    }
    return bytes;
  };
}

function openHistoryReal(seed: number): { real: HistoryReal; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "epoch-fuzz-history-"));
  const peerRoot = mkdtempSync(join(tmpdir(), "epoch-fuzz-history-peer-"));
  const snapshotRoots: string[] = [];
  const random = deterministicRandom(seed);
  const store = SignedChangeGraphStore.open(root, {
    author: "fuzz-alice",
    random,
    now: 1_700_000_000,
  });
  const real: HistoryReal = {
    store,
    peerRoot,
    random,
    peerRandom: deterministicRandom(seed ^ 0xa5a5_5a5a),
    tick: 1,
    openPeer: () => {
      const snapRoot = mkdtempSync(join(tmpdir(), "epoch-fuzz-history-snap-"));
      snapshotRoots.push(snapRoot);
      return SignedChangeGraphStore.open(snapRoot, {
        author: "fuzz-snap",
        random: deterministicRandom(seed ^ 0x5eed),
        now: 1_700_000_000,
      });
    },
  };
  return {
    real,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
      rmSync(peerRoot, { recursive: true, force: true });
      for (const snapRoot of snapshotRoots) rmSync(snapRoot, { recursive: true, force: true });
    },
  };
}

function promoteHistoryFailure(commands: unknown, error: unknown): void {
  const payload = {
    commands: String(commands),
    error: String((error as Error).message ?? error),
    at: new Date().toISOString(),
  };
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  const corpusDir = join(process.cwd(), "test/fuzz/corpus/v1/history");
  mkdirSync(corpusDir, { recursive: true });
  writeFileSync(join(corpusDir, `${hash}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  process.stderr.write(`history fuzz failure promoted to corpus/v1/history/${hash}.json\n`);
}

async function main(): Promise<void> {
  const long = process.env.EPOCH_FUZZ_HISTORY_LONG === "1" || process.env.EPOCH_FUZZ_LANE === "history-long";
  const params = long ? longFcParams() : shortFcParams();
  const maxCommands = long ? 48 : 16;

  await fc.assert(fc.asyncProperty(historyCommands(maxCommands), async (cmds) => {
    const { real, cleanup } = openHistoryReal(params.seed);
    try {
      const model = emptyModel();
      fc.modelRun(() => ({ model, real }), cmds);
      // Final convergence: replaying the store digest is stable under export/import.
      const digest = storeCanonicalDigest(real.store);
      const peer = real.openPeer();
      peer.applySnapshot(real.store.exportSnapshot());
      assert.equal(storeCanonicalDigest(peer), digest);
      assert.deepEqual(real.store.repository.verify(), []);
    } catch (error) {
      promoteHistoryFailure(cmds, error);
      throw error;
    } finally {
      cleanup();
    }
  }), {
    ...params,
    // Override command list sizing via env for campaigns.
    numRuns: Number(process.env.EPOCH_FUZZ_RUNS ?? params.numRuns),
  });

  // Explicit semantic convergence: identical RNG seeds produce identical change IDs
  // (signatures/keys remain node-local and are not part of this property).
  {
    const title = "converge-seed";
    const left = openHistoryReal(42);
    const right = openHistoryReal(42);
    try {
      const leftChange = left.real.store.createChange({ title });
      const rightChange = right.real.store.createChange({ title });
      assert.equal(leftChange.id, rightChange.id);
      assert.equal(String(leftChange.data.changeIdTrailer), String(rightChange.data.changeIdTrailer));
      assert.deepEqual(
        left.real.store.listRevisions().map((item) => ({ changeId: item.data.changeId, message: item.data.message })),
        right.real.store.listRevisions().map((item) => ({ changeId: item.data.changeId, message: item.data.message })),
      );
    } finally {
      left.cleanup();
      right.cleanup();
    }
  }

  process.stdout.write(JSON.stringify({
    suite: "history-command-model",
    lane: long ? "history-long" : "fast-check-short",
    seed: params.seed,
    numRuns: Number(process.env.EPOCH_FUZZ_RUNS ?? params.numRuns),
    maxCommands,
    status: "passed",
  }) + "\n");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${String((error as Error).stack ?? error)}\n`);
  process.exitCode = 1;
});
