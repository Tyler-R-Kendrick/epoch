import assert from "node:assert/strict";
import type { CommunityAuthorizationContext, CommunityEntity, CommunitySearchChangeSet } from "@epoch/community-core";
import { validateCommunityEntity } from "@epoch/community-core";
import { createCanonicalStoreSource } from "../../packages/Epoch.Community.API/src/community-source";
import { createNightboardSource } from "../../packages/Epoch.Community.Web/src/search/nightboard-source";
import {
  atprotoDeletionChangeSet,
  createAtprotoCommunitySource,
  normalizeAtprotoRecords,
} from "../../packages/Epoch.Atproto/src/community-search-source";
import { EpochLexicon, type AtRecord } from "../../packages/Epoch.Atproto/src/index";
import {
  abortSource,
  applyCommunityChangeSetAtomically,
  type AtomicCommunityChangeTarget,
  type CommunitySourceAdapter,
} from "@epoch/community-core";

const NOW = "2026-08-12T19:00:00.000Z";
const MAYA: CommunityAuthorizationContext = { actorId: "maya", readableDmIds: ["dm-team"] };

export async function runCommunitySourceAdapterTests(): Promise<void> {
  await canonicalStoreSourceConforms();
  await nightboardSourceConformsAndProtectsPrivateRecords();
  await atprotoSourceConformsAndPreservesProvenance();
  await atprotoDeletionIsAStableTombstoneChange();
  await failedPageDoesNotAdvanceCheckpoint();
  await atomicIngestionRollsBackAndMarksStale();
  cancellationIsExplicit();
}

async function canonicalStoreSourceConforms(): Promise<void> {
  const all = [entity("issue-a", "public"), entity("issue-b", "shared"), entity("issue-secret", "private", "other")];
  const checkpoint = { sourceId: "community-store", token: "7", observedAt: NOW, status: "current" as const };
  const source = createCanonicalStoreSource({
    readEntities: async () => all,
    checkpoint: async () => checkpoint,
  });
  await assertSourceConformance(source, MAYA, ["issue-a", "issue-b"]);
  await assert.rejects(() => source.scan({ limit: 0, authorization: MAYA }), /positive integer/u);
  assert.deepEqual((await source.scan({ limit: 10, authorization: {} })).entities.map((value) => value.ref.objectId), ["issue-a"]);
  assert.deepEqual((await source.get?.([{ objectId: "issue-secret", kind: "issue" }], MAYA)) ?? [], []);
}

async function nightboardSourceConformsAndProtectsPrivateRecords(): Promise<void> {
  const source = createNightboardSource({
    posts: [{ id: "post-a", title: "Public", body: "Visible", author: "maya", createdAt: NOW }],
    dmMessages: [{ id: "dm-secret", body: "DO_NOT_LEAK", author: "other", ownerId: "other", participantIds: ["other"], createdAt: NOW }],
  }, NOW);
  await assertSourceConformance(source, MAYA, ["post-a"]);
  assert.equal(JSON.stringify(await source.scan({ limit: 10, authorization: MAYA })).includes("DO_NOT_LEAK"), false);
  assert.throws(() => createNightboardSource({ posts: [{ id: "missing-time" }] }, NOW), /timestamp/u);
  assert.throws(() => createNightboardSource({ posts: [{ id: "duplicate", createdAt: NOW }, { objectId: "duplicate", createdAt: NOW }] }, NOW), /duplicate/u);
}

async function atprotoSourceConformsAndPreservesProvenance(): Promise<void> {
  const publicRecord = atRecord("at://did:plc:maya/org.epoch.issue/one", EpochLexicon.issue, {
    title: "Search issue",
    body: "Typed adapters",
    repo: "epoch/epoch",
    createdAt: NOW,
  });
  const privateRecord = atRecord("at://did:plc:other/org.epoch.issue/private", EpochLexicon.issue, {
    title: "DO_NOT_LEAK",
    visibility: "private",
    createdAt: NOW,
  });
  const unknown = atRecord("at://did:plc:maya/example.unknown/one", "example.unknown", { title: "Ignored", createdAt: NOW });
  const source = createAtprotoCommunitySource({ records: () => [unknown, privateRecord, publicRecord], mode: "federated", observedAt: NOW });
  const page = await source.scan({ limit: 10, authorization: {} });
  assert.equal(page.entities.length, 1);
  const mapped = page.entities[0] as CommunityEntity;
  assert.equal(mapped.ref.atUri, publicRecord.uri);
  assert.equal(mapped.ref.revision, publicRecord.cid);
  assert.equal(mapped.provenance.nativeId, publicRecord.uri);
  assert.equal(mapped.provenance.uri, publicRecord.uri);
  assert.equal(mapped.provenance.revision, publicRecord.cid);
  assert.equal(mapped.fields["atproto.repo"], "epoch/epoch");
  assert.doesNotMatch(JSON.stringify(page), /DO_NOT_LEAK/u);
  assert.equal(page.checkpoint.token, `federated:1:${publicRecord.cid}`);
  const repeated = await normalizeAtprotoRecords([publicRecord]);
  assert.equal(repeated[0]?.ref.objectId, mapped.ref.objectId);
  await assertSourceConformance(source, {}, [mapped.ref.objectId]);
  await assert.rejects(() => normalizeAtprotoRecords([{ ...publicRecord, value: { ...publicRecord.value, $type: EpochLexicon.repo } }]), /type/u);
}

async function atprotoDeletionIsAStableTombstoneChange(): Promise<void> {
  const record = atRecord("at://did:plc:maya/org.epoch.issue/removed", EpochLexicon.issue, { title: "Removed", createdAt: NOW });
  const before = await normalizeAtprotoRecords([record]);
  const deletion = await atprotoDeletionChangeSet({
    deleted: [record],
    checkpoint: { token: "2", observedAt: NOW, status: "current" },
  });
  assert.equal(deletion.deletes[0]?.objectId, before[0]?.ref.objectId);
  assert.equal(deletion.deletes[0]?.revision, record.cid);
  assert.equal(deletion.upserts.length, 0);
}

async function failedPageDoesNotAdvanceCheckpoint(): Promise<void> {
  let token = "before";
  let fail = true;
  const source = createCanonicalStoreSource({
    checkpoint: async () => ({ sourceId: "community-store", token, observedAt: NOW, status: "current" }),
    readEntities: async () => {
      if (fail) throw new Error("source failed");
      return [entity("issue-a", "public")];
    },
  });
  await assert.rejects(() => source.scan({ limit: 10, authorization: {} }), /source failed/u);
  assert.equal((await source.checkpoint()).token, "before");
  fail = false;
  token = "after";
  assert.equal((await source.scan({ limit: 10, authorization: {} })).checkpoint.token, "after");
}

async function atomicIngestionRollsBackAndMarksStale(): Promise<void> {
  const events: string[] = [];
  const target = (id: string, fail = false): AtomicCommunityChangeTarget => ({
    targetId: id,
    stage: async () => ({
      commit: async () => { events.push(`${id}:commit`); if (fail) throw new Error("commit failed"); },
      rollback: async () => { events.push(`${id}:rollback`); },
    }),
    markStale: async () => { events.push(`${id}:stale`); },
  });
  const changes: CommunitySearchChangeSet = {
    sourceId: "test",
    checkpoint: { sourceId: "test", token: "1", observedAt: NOW, status: "current" },
    upserts: [entity("issue-a", "public")],
    deletes: [],
    observedAt: NOW,
  };
  await assert.rejects(() => applyCommunityChangeSetAtomically(changes, [target("canonical"), target("index", true)]), /marked stale/u);
  assert.deepEqual(events, ["canonical:commit", "index:commit", "index:rollback", "index:stale", "canonical:rollback", "canonical:stale"]);
}

function cancellationIsExplicit(): void {
  const controller = new AbortController();
  controller.abort();
  assert.throws(() => abortSource(controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError");
}

async function assertSourceConformance(
  source: Pick<CommunitySourceAdapter, "sourceId" | "capabilities" | "checkpoint" | "scan" | "get">,
  authorization: CommunityAuthorizationContext,
  expected: readonly string[],
): Promise<void> {
  assert.equal(source.capabilities().sourceId, source.sourceId);
  assert.ok(source.capabilities().maxPageSize > 0);
  const seen: string[] = [];
  let after: string | undefined;
  for (let pages = 0; pages < 100; pages += 1) {
    const page = await source.scan({ ...(after === undefined ? {} : { after }), limit: 1, authorization });
    seen.push(...page.entities.map((value) => value.ref.objectId));
    if (page.next === undefined) break;
    assert.doesNotMatch(String.fromCharCode(...Uint8Array.from(atob(page.next.replaceAll("-", "+").replaceAll("_", "/")), (character) => character.charCodeAt(0))), new RegExp(page.entities[0]?.ref.objectId ?? "never", "u"));
    assert.notEqual(page.next, after);
    after = page.next;
  }
  assert.deepEqual(seen, expected);
  assert.equal(new Set(seen).size, seen.length);
  const firstCheckpoint = await source.checkpoint();
  const secondCheckpoint = await source.checkpoint();
  assert.deepEqual(secondCheckpoint, firstCheckpoint);
  if (source.get !== undefined && expected[0] !== undefined) {
    const first = (await source.scan({ limit: 1, authorization })).entities[0];
    assert.ok(first);
    assert.equal((await source.get([first.ref], authorization))[0]?.ref.objectId, first.ref.objectId);
  }
}

function entity(objectId: string, visibility: CommunityEntity["visibility"], ownerId = "maya"): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId, kind: "issue" },
    fields: { objectId, kind: "issue", title: objectId, visibility, createdAt: NOW, updatedAt: NOW },
    searchableText: { title: objectId },
    relations: [],
    visibility,
    ownerId,
    participantIds: ownerId === "maya" ? ["maya"] : [],
    createdAt: NOW,
    updatedAt: NOW,
    provenance: { sourceId: "test", nativeId: objectId, observedAt: NOW, checkpoint: "1" },
  });
}

function atRecord(uri: string, collection: string, value: Record<string, unknown>): AtRecord {
  const parts = uri.split("/");
  return {
    uri,
    cid: `bafy-${parts.at(-1)}`,
    did: parts[2] as string,
    collection,
    rkey: parts.at(-1) as string,
    value: { ...value, $type: collection },
    createdAt: NOW,
  };
}

if (require.main === module) {
  runCommunitySourceAdapterTests().then(
    () => console.log("community source adapter tests passed"),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
