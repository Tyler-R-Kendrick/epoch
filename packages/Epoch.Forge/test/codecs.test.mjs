import assert from "node:assert/strict";
import test from "node:test";
import { FORGE_CAPABILITIES, decodeF3Archive, decodeForgeFed, decodeNip34, decodeRadicle, encodeF3Archive, encodeForgeFed, encodeNip34, encodeRadicle } from "../dist/index.js";

const issue = { kind: "issue", objectId: "issue-1", repositoryId: "repo-1", title: "Fix parser", body: "public body", state: "open", authorId: "did:key:alice", createdAt: 1700000000, updatedAt: 1700000001, visibility: "public", revision: "rev-1" };

test("capability manifests pin honest source revisions and transport boundaries", () => {
  assert.equal(FORGE_CAPABILITIES.f3.specVersion, "4.0");
  assert.equal(FORGE_CAPABILITIES.forgefed.specVersion, "Branch Snapshot, 18 June 2025");
  assert.equal(FORGE_CAPABILITIES.forgefed.transport, "none");
  assert.equal(FORGE_CAPABILITIES.accessedAt, "2026-08-11");
});

test("F3 declared subset archives deterministically and quarantines malformed records", () => {
  const encoded = encodeF3Archive([issue, issue]);
  assert.equal(encoded.bytes, encodeF3Archive([issue, issue]).bytes);
  const decoded = decodeF3Archive(encoded.bytes);
  assert.deepEqual(decoded.objects, [issue]);
  assert.equal(decoded.losses.some((loss) => loss.reason === "duplicate-id"), true);
  const bad = decodeF3Archive('{"f3Version":"4.0","objects":[{"kind":"mystery"}]}');
  assert.equal(bad.quarantine.length, 1);
});

test("ForgeFed is codec-only, rejects private export, and reports unsupported fields", () => {
  const encoded = encodeForgeFed({ ...issue, labels: ["bug"] });
  assert.equal(encoded.document.type, "Ticket");
  assert.ok(encoded.losses.some((loss) => loss.path === "labels"));
  assert.deepEqual(decodeForgeFed(encoded.document).object.objectId, issue.objectId);
  assert.throws(() => encodeForgeFed({ ...issue, visibility: "private" }), /private/u);
});

test("NIP-34 mapping rejects replay, expiry, audience, size, and malformed events", () => {
  const encoded = encodeNip34(issue, { eventId: "ab".repeat(32), pubkey: "cd".repeat(32), createdAt: 1700000000, expiresAt: 1700000100, audience: ["repo-1"] });
  const seen = new Set();
  assert.equal(decodeNip34(encoded.event, { now: 1700000001, audience: "repo-1", seen }).object.objectId, "issue-1");
  assert.throws(() => decodeNip34(encoded.event, { now: 1700000001, audience: "repo-1", seen }), /replay/u);
  assert.throws(() => decodeNip34(encoded.event, { now: 1700000200, audience: "repo-1", seen: new Set() }), /expired/u);
  assert.throws(() => decodeNip34(encoded.event, { now: 1700000001, audience: "repo-2", seen: new Set() }), /audience/u);
  assert.throws(() => decodeNip34({ ...encoded.event, content: "x".repeat(70_000) }, { now: 1700000001, audience: "repo-1", seen: new Set() }), /size/u);
  assert.throws(() => decodeNip34({}), /malformed/u);
});

test("Radicle IDs, signed refs, and patches preserve revisions and reject stale replay", () => {
  const encoded = encodeRadicle(issue, { radicleId: "rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5", signedRef: "refs/rad/sigrefs/abc", sequence: 2 });
  assert.equal(encoded.record.patchId, "issue-1");
  assert.equal(decodeRadicle(encoded.record, { lastSequence: 1 }).object.revision, "rev-1");
  assert.throws(() => decodeRadicle(encoded.record, { lastSequence: 2 }), /stale/u);
});
