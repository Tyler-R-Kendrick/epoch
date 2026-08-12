import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ExplicitParentEventLog,
  OperationDag,
  QuarantineTransaction,
  recoverQuarantineTransaction,
} from "../../packages/Epoch.Core/src/convergence-transactions";
import { EpochRepository } from "../../packages/Epoch.Core/src/core";

export async function runConvergenceCoreTransactionTests(): Promise<void> {
  test("CONV-TXN-001 explicit parents exclude unrelated heads and choose Lamport from parents", explicitParents);
  test("CONV-TXN-002 stale CAS missing parent cycle and replay fail closed", invalidAppends);
  test("CONV-TXN-003 crash boundaries recover all-old or all-new", atomicCrashRecovery);
  test("CONV-OP-001 operation DAG survives restart and redacts secrets", operationsPersistAndRedact);
  test("CONV-TXN-004 EpochRepository appendWithParents preserves unrelated heads", repositoryFacadeParents);
}

function repositoryFacadeParents(): void {
  const directory = mkdtempSync(join(tmpdir(), "epoch-explicit-parents-"));
  try {
    const repository = EpochRepository.create(directory, { author: "alice" });
    const root = repository.appendWithParents("change.created", { schema: "epoch.change.created.v2" }, {
      author: "alice", parents: [], expectedHeads: [], transactionId: "tx-root",
    });
    const left = repository.appendWithParents("change.revised", { schema: "epoch.change.revised.v2" }, {
      author: "alice", parents: [root.id], expectedHeads: [root.id], transactionId: "tx-left",
    });
    const unrelated = repository.appendWithParents("change.created", { schema: "epoch.change.created.v2" }, {
      author: "alice", parents: [root.id], expectedHeads: [left.id], transactionId: "tx-unrelated",
    });
    assert.deepEqual(repository.heads(), [left.id, unrelated.id].sort());
    const merged = repository.appendWithParents("change.revised", { schema: "epoch.change.revised.v2" }, {
      author: "alice", parents: [left.id], expectedHeads: [left.id, unrelated.id], transactionId: "tx-right",
    });
    assert.deepEqual(merged.parents, [left.id]);
    assert.deepEqual(repository.heads(), [merged.id, unrelated.id].sort());
    assert.throws(() => repository.appendWithParents("change.revised", {}, {
      author: "alice", parents: [merged.id], expectedHeads: [merged.id], transactionId: "tx-stale",
    }), /stale head/i);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

function test(name: string, run: () => void): void {
  try { run(); } catch (error) { throw new Error(name, { cause: error }); }
}

function explicitParents(): void {
  const log = new ExplicitParentEventLog([
    event("root", [], 0), event("left", ["root"], 1), event("unrelated", ["root"], 1),
  ]);
  const appended = log.appendWithParents("change.revised", {}, {
    eventId: "right", author: "alice", parents: ["left"], expectedHeads: ["left", "unrelated"], transactionId: "tx-1",
  });
  assert.deepEqual(appended.parents, ["left"]);
  assert.equal(appended.lamport, 2);
  assert.deepEqual(log.heads(), ["right", "unrelated"]);
}

function invalidAppends(): void {
  const log = new ExplicitParentEventLog([event("root", [], 0), event("left", ["root"], 1)]);
  assert.throws(() => log.appendWithParents("change.revised", {}, {
    eventId: "stale", author: "alice", parents: ["left"], expectedHeads: ["root"], transactionId: "tx-stale",
  }), /stale-head/u);
  assert.throws(() => log.appendWithParents("change.revised", {}, {
    eventId: "missing", author: "alice", parents: ["absent"], expectedHeads: ["left"], transactionId: "tx-missing",
  }), /missing-dependency/u);
  assert.throws(() => log.appendWithParents("change.revised", {}, {
    eventId: "left", author: "alice", parents: ["left"], expectedHeads: ["left"], transactionId: "tx-cycle",
  }), /transaction-failed/u);
  const options = { eventId: "next", author: "alice", parents: ["left"], expectedHeads: ["left"], transactionId: "tx-replay" } as const;
  log.appendWithParents("change.revised", {}, options);
  assert.throws(() => log.appendWithParents("change.revised", {}, { ...options, eventId: "another" }), /transaction-failed/u);
}

function atomicCrashRecovery(): void {
  for (const boundary of ["prepared", "objects", "events", "indexes", "heads"] as const) {
    const directory = mkdtempSync(join(tmpdir(), "epoch-quarantine-"));
    try {
      const transaction = new QuarantineTransaction(directory, "tx-crash", { heads: ["old"] });
      transaction.stage({ objects: { new: "body" }, events: { event: "signed" }, indexes: { change: "event" }, heads: ["new"] });
      assert.throws(() => transaction.publish({ failAfter: boundary }), /transaction-failed/u);
      recoverQuarantineTransaction(directory, "tx-crash");
      const state = JSON.parse(readFileSync(join(directory, "state.json"), "utf8"));
      const isOld = JSON.stringify(state) === JSON.stringify({ objects: {}, events: {}, indexes: {}, heads: ["old"] });
      const isNew = JSON.stringify(state) === JSON.stringify({ objects: { new: "body" }, events: { event: "signed" }, indexes: { change: "event" }, heads: ["new"] });
      assert.ok(isOld || isNew, `boundary ${boundary} exposed partial state`);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
}

function operationsPersistAndRedact(): void {
  const directory = mkdtempSync(join(tmpdir(), "epoch-operations-"));
  try {
    const dag = new OperationDag(directory);
    dag.record({ operationId: id("operation", "a"), parents: [], command: "merge", args: ["--token", "secret", "feature"], timestamp: 1 });
    dag.record({ operationId: id("operation", "b"), parents: [], command: "inspect", args: ["--api-key=hidden"], timestamp: 2 });
    const reopened = new OperationDag(directory);
    assert.deepEqual(reopened.heads(), [id("operation", "a"), id("operation", "b")]);
    assert.deepEqual(reopened.get(id("operation", "a"))?.args, ["--token", "[REDACTED]", "feature"]);
    assert.deepEqual(reopened.get(id("operation", "b"))?.args, ["--api-key=[REDACTED]"]);
    const restore = reopened.restore(id("operation", "a"), id("operation", "c"), 3);
    assert.equal(restore.command, "restore");
    assert.deepEqual(restore.parents, [id("operation", "a"), id("operation", "b")]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

function event(eventId: string, parents: readonly string[], lamport: number) {
  return { eventId, type: "change.created", payload: {}, author: "alice", parents, lamport, transactionId: `seed-${eventId}` };
}

function id(kind: string, token: string): string { return `epoch:${kind}:${token.repeat(52)}`; }
