import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";
import { SignedChangeGraphStore } from "@epoch/core";
import { assertProtocolEvent, parseCanonicalId } from "@epoch/protocol";

export function runChangeGraphStoreTests(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-change-graph-store-"));
  try {
    const repository = EpochRepository.create(root, { author: "alice" });
    const store = SignedChangeGraphStore.open(root, {
      random: deterministicRandom(1),
    });

    const created = store.createChange({ title: "Parser", parentRevisionIds: [] });
    assert.match(created.id, /^epoch:change:/u);
    parseCanonicalId(created.id, "change");
    assert.equal(created.kind, "change");
    assert.equal(created.data.title, "Parser");
    const revisionId = String(created.data.revisionId);
    assert.match(revisionId, /^[a-f0-9]{64}$/u);

    const events = repository.events();
    const changeEvent = events.find((event) => event.type === "change.created");
    assert.ok(changeEvent, "change.created must be a signed repository event");
    assert.equal(changeEvent.id, revisionId);
    assert.deepEqual(repository.verify(), []);
    assertProtocolEvent({
      schemaVersion: 1,
      type: "change.created",
      eventId: changeEvent.id,
      revisionId: changeEvent.id,
      body: changeEvent.payload,
    });

    const revised = store.reviseChange(created.id, { message: "tighten parser" });
    assert.equal(revised.id, created.id);
    assert.equal(revised.revision, 2);
    assert.notEqual(revised.data.revisionId, revisionId);
    assert.ok(repository.events().some((event) => event.type === "change.revised"));
    assert.deepEqual(repository.verify(), []);

    const shown = store.showChange(created.id);
    assert.equal(shown.data.title, "Parser");
    assert.equal(shown.data.revisionId, revised.data.revisionId);

    const mergeRevision = store.createRevision({
      parentRevisionIds: [String(created.data.revisionId), String(revised.data.revisionId)],
      message: "merge heads",
    });
    assert.match(String(mergeRevision.id), /^[a-f0-9]{64}$/u);
    assert.equal(mergeRevision.kind, "revision");

    const graph = store.createGraph({
      name: "series",
      memberRevisionIds: [String(created.data.revisionId), String(revised.data.revisionId)],
    });
    parseCanonicalId(graph.id, "change-graph");
    assert.ok(repository.events().some((event) => event.type === "change-graph.defined"));

    const bundle = store.createReviewBundle({
      name: "parallel",
      selectedRevisionIds: [String(revised.data.revisionId)],
    });
    parseCanonicalId(bundle.id, "review-bundle");

    const review = store.recordReview({
      targetId: created.id,
      state: "approved",
      body: "looks good",
    });
    assert.match(review.id, /^[a-f0-9]{64}$/u);
    assert.ok(repository.events().some((event) => event.type === "review.recorded"));

    const plan = store.createMergePlan({
      targetRevisionId: String(revised.data.revisionId),
      selectedRevisionIds: [String(revised.data.revisionId)],
    });
    parseCanonicalId(plan.id, "merge-plan");
    const applied = store.applyMergePlan(plan.id);
    assert.equal(applied.data.status, "applied");
    assert.ok(repository.events().some((event) => event.type === "merge.plan.applied"));

    assert.equal(store.listConflicts().length, 0);

    const peer = mkdtempSync(join(tmpdir(), "epoch-change-graph-peer-"));
    const peerStore = SignedChangeGraphStore.open(peer, { random: deterministicRandom(2) });
    peerStore.createChange({ title: "Peer change" });
    const synced = store.syncFromLocal(peer);
    assert.ok(synced.eventsCopied > 0);
    assert.deepEqual(store.hydratePaths(), { hydrated: [] });
    assert.deepEqual(store.backfill(), { fetched: [], promised: 0 });
    const mirror = store.addMirror({ remoteRef: "refs/heads/main" });
    parseCanonicalId(mirror.id, "mirror");
    assert.equal(store.runMirror(mirror.id).data.status, "recorded");
    store.allocateBudget({ units: 8 });
    assert.equal(store.budgetStatus().remaining, 8);
    store.recordHeritageMapping("swh:1:cnt:e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
    assert.ok(repository.events().some((event) => event.type === "software-heritage.mapping"));
    assert.deepEqual(repository.verify(), []);
    assert.equal(repository.events().some((event) => event.type === "repository.identity"), true);
    rmSync(peer, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function deterministicRandom(seed: number): (byteLength: number) => Uint8Array {
  let counter = BigInt(seed);
  return (byteLength: number) => {
    const bytes = new Uint8Array(byteLength);
    for (let index = 0; index < byteLength; index += 1) {
      counter += 1n;
      bytes[index] = Number(counter & 0xffn);
    }
    return bytes;
  };
}
