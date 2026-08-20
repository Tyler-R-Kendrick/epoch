import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import { FileSystemWorkspaceProvider, SignedChangeGraphStore } from "@epoch/core";
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

interface OpenHistoryReal {
  readonly real: HistoryReal;
  readonly cleanup: () => void;
}

function openHistoryReal(seed: number): OpenHistoryReal {
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

function promoteHistoryFailure<Commands, Failure>(commands: Commands, error: Failure): void {
  const payload = {
    commands: String(commands),
    // SAFETY: Runtime checks or construction above establish Error).message ?? error).
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

  await assertSnapshotThenTailConverges();
  await assertMissingRevisionAndPathEscape();
  await assertRejectedConflictBlocksMerge();
  await assertGitIngestRecordsDeclaredSubset();
  await assertWorkspaceProviderStaysInsideRoot();

  process.stdout.write(JSON.stringify({
    suite: "history-command-model",
    lane: long ? "history-long" : "fast-check-short",
    seed: params.seed,
    numRuns: Number(process.env.EPOCH_FUZZ_RUNS ?? params.numRuns),
    maxCommands,
    status: "passed",
  }) + "\n");
}

async function assertSnapshotThenTailConverges(): Promise<void> {
  const first = openHistoryReal(7);
  try {
    first.real.store.createChange({ title: "snap-a" });
    first.real.store.createChange({ title: "snap-b" });
    const mid = first.real.store.exportSnapshot();
    first.real.store.createChange({ title: "snap-c" });
    const full = first.real.store.exportSnapshot();
    const expected = storeCanonicalDigest(first.real.store);

    const viaFull = first.real.openPeer();
    viaFull.applySnapshot(full);
    assert.equal(storeCanonicalDigest(viaFull), expected);

    const viaTail = first.real.openPeer();
    viaTail.applySnapshot(mid);
    const tail = viaTail.applySnapshot(full);
    assert.ok(tail.eventsCopied >= 0);
    assert.equal(storeCanonicalDigest(viaTail), expected);
    const again = viaTail.applySnapshot(full);
    assert.equal(again.eventsCopied, 0);
  } finally {
    first.cleanup();
  }
}

async function assertMissingRevisionAndPathEscape(): Promise<void> {
  const opened = openHistoryReal(11);
  try {
    const fake = "b".repeat(64);
    assert.throws(
      () => opened.real.store.createChange({ title: "dangling", parentRevisionIds: [fake] }),
      /not found|RevisionId|existing signed/u,
    );
    const outside = join(opened.real.store.repository.root, "..", "no-replica");
    assert.throws(() => opened.real.store.syncFromLocal(outside), /not found/u);
    assert.deepEqual(opened.real.store.hydratePaths(["../etc/passwd"]).hydrated, []);
  } finally {
    opened.cleanup();
  }
}

async function assertRejectedConflictBlocksMerge(): Promise<void> {
  const opened = openHistoryReal(13);
  try {
    const created = opened.real.store.createChange({ title: "base" });
    const proposal = opened.real.store.proposeAiConflict("block-merge");
    opened.real.store.decideConflict(proposal.id, "rejected");
    const plan = opened.real.store.createMergePlan({
      targetRevisionId: String(created.data.revisionId),
      selectedRevisionIds: [String(created.data.revisionId)],
    });
    assert.throws(() => opened.real.store.applyMergePlan(plan.id), /unresolved conflict/u);
    assert.equal(opened.real.store.showMergePlan(plan.id).data.status, "planned");
  } finally {
    opened.cleanup();
  }
}

async function assertGitIngestRecordsDeclaredSubset(): Promise<void> {
  const opened = openHistoryReal(17);
  const gitRoot = mkdtempSync(join(tmpdir(), "epoch-fuzz-git-"));
  try {
    execFileSync("git", ["-C", gitRoot, "-c", "init.defaultBranch=main", "init"], { stdio: "pipe" });
    execFileSync("git", ["-C", gitRoot, "config", "user.email", "fuzz@example.invalid"], { stdio: "pipe" });
    execFileSync("git", ["-C", gitRoot, "config", "user.name", "fuzz"], { stdio: "pipe" });
    writeFileSync(join(gitRoot, "note.txt"), "from-git\n");
    execFileSync("git", ["-C", gitRoot, "add", "note.txt"], { stdio: "pipe" });
    execFileSync("git", ["-C", gitRoot, "commit", "-m", "one"], { stdio: "pipe" });
    const commit = execFileSync("git", ["-C", gitRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const ingested = opened.real.store.ingestGit(gitRoot, "origin");
    assert.equal(ingested.commitOid, commit);
    assert.ok(ingested.recorded >= 1);
    assert.equal(ingested.remote, "origin");
    assert.deepEqual(opened.real.store.repository.verify(), []);
  } finally {
    opened.cleanup();
    rmSync(gitRoot, { recursive: true, force: true });
  }
}

async function assertWorkspaceProviderStaysInsideRoot(): Promise<void> {
  const opened = openHistoryReal(19);
  try {
    const provider = new FileSystemWorkspaceProvider(opened.real.store.repository.root);
    for (const escape of ["../secret", "..\\secret", "/etc/passwd", "foo/../../etc/passwd"]) {
      await assert.rejects(provider.read(escape), /below the provider root|invalid/u);
      await assert.rejects(provider.write(escape, Buffer.from("x")), /below the provider root|invalid/u);
    }
  } finally {
    opened.cleanup();
  }
}

void main().catch((error) => {
  // SAFETY: Runtime checks or construction above establish Error).stack ?? error)}\n`).
  process.stderr.write(`${String((error as Error).stack ?? error)}\n`);
  process.exitCode = 1;
});
