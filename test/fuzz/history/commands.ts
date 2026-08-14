import assert from "node:assert/strict";
import { join } from "node:path";
import fc from "fast-check";
import { SignedChangeGraphStore } from "@epoch/core";
import {
  allRevisionIds,
  emptyModel,
  storeCanonicalDigest,
  syncModelCounts,
  type HistoryModel,
  type HistoryReal,
} from "./model";

type Cmd = fc.Command<HistoryModel, HistoryReal>;

class CreateChangeCommand implements Cmd {
  constructor(readonly title: string) {}
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const created = real.store.createChange({ title: this.title });
    model.changes.push({
      id: created.id,
      title: this.title,
      revisionIds: [String(created.data.revisionId)],
      published: false,
    });
    syncModelCounts(model, real.store);
    assert.equal(real.store.showChange(created.id).id, created.id);
  }
  toString = (): string => `CreateChange(${JSON.stringify(this.title)})`;
}

class ReviseChangeCommand implements Cmd {
  constructor(readonly changeIndex: number, readonly message: string) {}
  check(model: HistoryModel): boolean {
    return model.changes.length > 0;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const change = model.changes[this.changeIndex % model.changes.length]!;
    const revised = real.store.reviseChange(change.id, { message: this.message });
    change.revisionIds.push(String(revised.data.revisionId));
    syncModelCounts(model, real.store);
    assert.equal(String(real.store.showChange(change.id).data.revisionId), String(revised.data.revisionId));
  }
  toString = (): string => `ReviseChange(${this.changeIndex},${JSON.stringify(this.message)})`;
}

class PublishChangeCommand implements Cmd {
  constructor(readonly changeIndex: number) {}
  check(model: HistoryModel): boolean {
    return model.changes.length > 0;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const change = model.changes[this.changeIndex % model.changes.length]!;
    const published = real.store.publishChange(change.id, { target: "main", topic: "fuzz" });
    change.published = true;
    assert.equal(published.data.reviewRef, "refs/for/main");
    assert.equal(real.store.showChange(change.id).data.reviewRef, "refs/for/main");
    syncModelCounts(model, real.store);
  }
  toString = (): string => `PublishChange(${this.changeIndex})`;
}

class ParallelHeadCommand implements Cmd {
  constructor(readonly leftIndex: number, readonly rightIndex: number, readonly message: string) {}
  check(model: HistoryModel): boolean {
    return allRevisionIds(model).length >= 2;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const revisions = allRevisionIds(model);
    const left = revisions[this.leftIndex % revisions.length]!;
    const right = revisions[this.rightIndex % revisions.length]!;
    const parents = left === right && revisions.length > 1
      ? [left, revisions[(this.rightIndex + 1) % revisions.length]!]
      : [left, right];
    const created = real.store.createRevision({ parentRevisionIds: parents, message: this.message });
    model.changes.push({
      id: String(created.data.changeId),
      title: this.message,
      revisionIds: [String(created.id)],
      published: false,
    });
    syncModelCounts(model, real.store);
  }
  toString = (): string => `ParallelHead(${this.leftIndex},${this.rightIndex},${JSON.stringify(this.message)})`;
}

class CreateGraphCommand implements Cmd {
  constructor(readonly name: string, readonly memberIndex: number) {}
  check(model: HistoryModel): boolean {
    return allRevisionIds(model).length > 0;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const revisions = allRevisionIds(model);
    const member = revisions[this.memberIndex % revisions.length]!;
    const graph = real.store.createGraph({ name: this.name, memberRevisionIds: [member] });
    model.graphs.push({ id: graph.id, memberRevisionIds: [member] });
    assert.deepEqual(real.store.showGraph(graph.id).data.memberRevisionIds, [member]);
    syncModelCounts(model, real.store);
  }
  toString = (): string => `CreateGraph(${JSON.stringify(this.name)},${this.memberIndex})`;
}

class MergePlanApplyCommand implements Cmd {
  constructor(readonly revisionIndex: number) {}
  check(model: HistoryModel): boolean {
    return allRevisionIds(model).length > 0
      && model.conflicts.every((conflict) => conflict.status === "accepted");
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const revisions = allRevisionIds(model);
    const target = revisions[this.revisionIndex % revisions.length]!;
    const beforeDigest = storeCanonicalDigest(real.store);
    const plan = real.store.createMergePlan({
      targetRevisionId: target,
      selectedRevisionIds: [target],
    });
    const applied = real.store.applyMergePlan(plan.id);
    assert.equal(applied.data.status, "applied");
    model.mergePlans.push({ id: plan.id, applied: true });
    // Merge must not drop prior events (event set only grows).
    assert.ok(real.store.repository.events().length >= model.eventCount);
    assert.notEqual(storeCanonicalDigest(real.store), beforeDigest);
    syncModelCounts(model, real.store);
  }
  toString = (): string => `MergePlanApply(${this.revisionIndex})`;
}

class ConflictDecideCommand implements Cmd {
  constructor(readonly suffix: string) {}
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const proposal = real.store.proposeAiConflict(`fuzz-${this.suffix}`);
    assert.equal(proposal.data.trusted, false);
    const decided = real.store.decideConflict(proposal.id, "accepted");
    assert.equal(decided.data.status, "accepted");
    model.conflicts.push({ id: proposal.id, status: "accepted" });
    const listed = real.store.listConflicts().find((item) => item.id === proposal.id);
    assert.ok(listed);
    assert.equal(listed.data.status, "accepted");
    syncModelCounts(model, real.store);
  }
  toString = (): string => `ConflictDecide(${this.suffix})`;
}

class SnapshotRoundtripCommand implements Cmd {
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const snapshot = real.store.exportSnapshot();
    const expected = storeCanonicalDigest(real.store);
    const peer = real.openPeer();
    peer.applySnapshot(snapshot);
    assert.equal(storeCanonicalDigest(peer), expected);
    // Re-applying the same snapshot is idempotent for event identity.
    peer.applySnapshot(snapshot);
    assert.equal(storeCanonicalDigest(peer), expected);
    syncModelCounts(model, real.store);
  }
  toString = (): string => "SnapshotRoundtrip()";
}

class SyncFromPeerCommand implements Cmd {
  constructor(readonly title: string) {}
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const peer = SignedChangeGraphStore.open(real.peerRoot, {
      random: real.peerRandom,
      now: 1_700_000_000 + real.tick,
      author: "peer",
    });
    real.tick += 1;
    const created = peer.createChange({ title: this.title });
    const before = real.store.repository.events().length;
    const synced = real.store.syncFromLocal(real.peerRoot);
    assert.ok(synced.eventsCopied > 0);
    assert.ok(real.store.repository.events().length > before);
    // Duplicate sync is idempotent for event count.
    const again = real.store.syncFromLocal(real.peerRoot);
    assert.equal(again.eventsCopied, 0);
    model.changes.push({
      id: created.id,
      title: this.title,
      revisionIds: [String(created.data.revisionId)],
      published: false,
    });
    syncModelCounts(model, real.store);
  }
  toString = (): string => `SyncFromPeer(${JSON.stringify(this.title)})`;
}

class IdempotentShowCommand implements Cmd {
  constructor(readonly changeIndex: number) {}
  check(model: HistoryModel): boolean {
    return model.changes.length > 0;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const change = model.changes[this.changeIndex % model.changes.length]!;
    const first = real.store.showChange(change.id);
    const second = real.store.showChange(change.id);
    assert.deepEqual(second, first);
    syncModelCounts(model, real.store);
  }
  toString = (): string => `IdempotentShow(${this.changeIndex})`;
}

class MissingRevisionFailClosedCommand implements Cmd {
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const fake = "a".repeat(64);
    assert.throws(
      () => real.store.createChange({ title: "orphan", parentRevisionIds: [fake] }),
      /not found|RevisionId|existing signed/u,
    );
    assert.throws(
      () => real.store.createGraph({ name: "missing-member", memberRevisionIds: [fake] }),
      /not found|RevisionId|existing signed/u,
    );
    assert.throws(() => real.store.showChange("epoch:change:not-a-real-change-id"), /not found|canonical/u);
    syncModelCounts(model, real.store);
  }
  toString = (): string => "MissingRevisionFailClosed()";
}

class RejectConflictCommand implements Cmd {
  constructor(readonly suffix: string) {}
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const proposal = real.store.proposeAiConflict(`reject-${this.suffix}`);
    assert.equal(proposal.data.trusted, false);
    const decided = real.store.decideConflict(proposal.id, "rejected");
    assert.equal(decided.data.status, "rejected");
    const listed = real.store.listConflicts().find((item) => item.id === proposal.id);
    assert.ok(listed);
    assert.equal(listed.data.status, "rejected");
    model.conflicts.push({ id: proposal.id, status: "rejected" });
    syncModelCounts(model, real.store);
  }
  toString = (): string => `RejectConflict(${this.suffix})`;
}

class UnresolvedConflictBlocksMergeCommand implements Cmd {
  constructor(readonly revisionIndex: number) {}
  check(model: HistoryModel): boolean {
    return allRevisionIds(model).length > 0
      && model.conflicts.some((conflict) => conflict.status !== "accepted");
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const revisions = allRevisionIds(model);
    const target = revisions[this.revisionIndex % revisions.length]!;
    const plan = real.store.createMergePlan({
      targetRevisionId: target,
      selectedRevisionIds: [target],
    });
    assert.throws(() => real.store.applyMergePlan(plan.id), /unresolved conflict/u);
    assert.equal(real.store.showMergePlan(plan.id).data.status, "planned");
    model.mergePlans.push({ id: plan.id, applied: false });
    syncModelCounts(model, real.store);
  }
  toString = (): string => `UnresolvedConflictBlocksMerge(${this.revisionIndex})`;
}

class PathTraversalFailClosedCommand implements Cmd {
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const outside = join(real.store.repository.root, "..", `escape-${real.tick}`);
    assert.throws(() => real.store.syncFromLocal(outside), /not found/u);
    const hydrated = real.store.hydratePaths(["../etc/passwd", "..\\windows", "/etc/passwd"]);
    assert.deepEqual(hydrated.hydrated, []);
    syncModelCounts(model, real.store);
  }
  toString = (): string => "PathTraversalFailClosed()";
}

class InvalidBudgetAndAuthCommand implements Cmd {
  constructor(readonly units: number) {}
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    assert.throws(() => real.store.allocateBudget({ units: this.units }), /nonnegative/u);
    assert.throws(() => real.store.authExplain({ action: "forge.admin" }), /no grant authorizes/u);
    assert.throws(() => real.store.assertPublicArchive("private"), /cannot be archived/u);
    real.store.assertPublicArchive("public");
    syncModelCounts(model, real.store);
  }
  toString = (): string => `InvalidBudgetAndAuth(${this.units})`;
}

class DuplicateSnapshotApplyCommand implements Cmd {
  check = (): boolean => true;
  run(model: HistoryModel, real: HistoryReal): void {
    const snapshot = real.store.exportSnapshot();
    const expected = storeCanonicalDigest(real.store);
    const peer = real.openPeer();
    const first = peer.applySnapshot(snapshot);
    const second = peer.applySnapshot(snapshot);
    assert.equal(second.eventsCopied, 0);
    assert.ok(first.eventsCopied >= 0);
    assert.equal(storeCanonicalDigest(peer), expected);
    syncModelCounts(model, real.store);
  }
  toString = (): string => "DuplicateSnapshotApply()";
}

class RestoreLatestOperationCommand implements Cmd {
  check(model: HistoryModel): boolean {
    return model.eventCount > 1;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const ops = real.store.operations();
    if (ops.length === 0) return;
    const last = ops[ops.length - 1]!;
    const restored = real.store.restoreOperation(last.operationId);
    assert.equal(restored.restores, last.operationId);
    assert.ok(real.store.operations().some((item) => item.restores === last.operationId));
    syncModelCounts(model, real.store);
  }
  toString = (): string => "RestoreLatestOperation()";
}

class RecordReviewCommand implements Cmd {
  constructor(readonly changeIndex: number) {}
  check(model: HistoryModel): boolean {
    return model.changes.length > 0;
  }
  run(model: HistoryModel, real: HistoryReal): void {
    const change = model.changes[this.changeIndex % model.changes.length]!;
    const recorded = real.store.recordReview({
      targetId: change.id,
      state: "approved",
      body: "fuzz-review",
    });
    assert.equal(recorded.data.state, "approved");
    assert.equal(recorded.data.targetId, change.id);
    syncModelCounts(model, real.store);
  }
  toString = (): string => `RecordReview(${this.changeIndex})`;
}

export function historyCommands(maxCommands = 24): fc.Arbitrary<Iterable<Cmd>> {
  return fc.commands([
    fc.stringMatching(/^change-[a-z0-9-]{1,16}$/u).map((title) => new CreateChangeCommand(title)),
    fc.tuple(fc.nat({ max: 32 }), fc.stringMatching(/^rev-[a-z0-9-]{1,16}$/u))
      .map(([index, message]) => new ReviseChangeCommand(index, message)),
    fc.nat({ max: 32 }).map((index) => new PublishChangeCommand(index)),
    fc.tuple(fc.nat({ max: 32 }), fc.nat({ max: 32 }), fc.stringMatching(/^head-[a-z0-9-]{1,12}$/u))
      .map(([left, right, message]) => new ParallelHeadCommand(left, right, message)),
    fc.tuple(fc.stringMatching(/^graph-[a-z0-9-]{1,12}$/u), fc.nat({ max: 32 }))
      .map(([name, index]) => new CreateGraphCommand(name, index)),
    fc.nat({ max: 32 }).map((index) => new MergePlanApplyCommand(index)),
    fc.stringMatching(/^[a-z0-9]{1,8}$/u).map((suffix) => new ConflictDecideCommand(suffix)),
    fc.stringMatching(/^[a-z0-9]{1,8}$/u).map((suffix) => new RejectConflictCommand(suffix)),
    fc.nat({ max: 32 }).map((index) => new UnresolvedConflictBlocksMergeCommand(index)),
    fc.constant(new SnapshotRoundtripCommand()),
    fc.constant(new DuplicateSnapshotApplyCommand()),
    fc.constant(new MissingRevisionFailClosedCommand()),
    fc.constant(new PathTraversalFailClosedCommand()),
    fc.constant(new RestoreLatestOperationCommand()),
    fc.integer({ min: -8, max: -1 }).map((units) => new InvalidBudgetAndAuthCommand(units)),
    fc.nat({ max: 32 }).map((index) => new RecordReviewCommand(index)),
    fc.stringMatching(/^peer-[a-z0-9-]{1,12}$/u).map((title) => new SyncFromPeerCommand(title)),
    fc.nat({ max: 32 }).map((index) => new IdempotentShowCommand(index)),
  ], { maxCommands, size: "+1" });
}

export { emptyModel };
