import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCommunityApiFetchHandler, createInMemoryCommunityApi } from "@epoch/community-api";
import type { CommunityMessage } from "@epoch/community-core";

export async function runCommunityApiProjectionTests(): Promise<void> {
  await test("NAV-MIGRATE-001 API schema migration preserves data", apiMigrationPreservesDataAndAssignsIdsOnce);
  await test("NAV-PROJ-002 schema-2 saved-view data migrates to canonical projection identity", savedViewIdentityMigratesOnce);
  await test("unshipped flat projection methods are absent from the repository facade", flatProjectionFacadeIsAbsent);
  await test("Community facade exposes canonical Change vocabulary only", changeVocabularyIsCanonical);
  await test("NAV-ACTION-002 PATCH object state requires explicit write authorization", objectStateMutationRequiresWriteAuthorization);
  await test("Community API persistence rejects malformed scalar and graph records", malformedPersistenceFailsAtBoundary);
  await test("Community API persistence replaces files atomically", persistenceWritesAtomically);
  await test("Community API state vocabulary is bounded and updates timestamps", objectStateIsBoundedAndTimestamped);
  await test("NAV-QUERY-003 private repository canonical objects use repository authorization", privateRepositoryObjectsFailClosed);
}

async function objectStateMutationRequiresWriteAuthorization(): Promise<void> {
  const api = createInMemoryCommunityApi({ messages: [sampleMessage()] });
  await assert.rejects(() => api.updateObjectState("m-api-1", "read"), /permission denied/u);
  await assert.rejects(
    () => api.updateObjectState("m-api-1", "read", { actorId: "alice" }),
    /permission denied/u,
  );

  const unauthenticated = createCommunityApiFetchHandler(api);
  const denied = await unauthenticated(new Request("https://epoch.invalid/objects/m-api-1/state", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "read" }),
  }));
  assert.equal(denied.status, 403);
  assert.equal((await api.getObject("m-api-1", { actorId: "alice" })).state, "needs-review");

  const authorized = createCommunityApiFetchHandler(api, {
    resolveAuthorization: () => ({ actorId: "alice", permissions: ["object:state:write"] }),
  });
  const allowed = await authorized(new Request("https://epoch.invalid/objects/m-api-1/state", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "read" }),
  }));
  assert.equal(allowed.status, 200);
  assert.equal((await api.getObject("m-api-1", { actorId: "alice" })).state, "read");
}

async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    throw new Error(name, { cause: error });
  }
}

async function apiMigrationPreservesDataAndAssignsIdsOnce(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-api-migration-"));
  const persistencePath = join(directory, "state.json");
  try {
    writeFileSync(persistencePath, JSON.stringify({
      schemaVersion: 1,
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "preserved",
        visibility: "public",
        defaultView: "main",
        maintainers: ["alice"],
        topics: [],
        issues: [{
          id: "ISSUE-1",
          title: "Migrated",
          author: "bob",
          body: "body",
          labels: [],
          status: "open",
          comments: [{ author: "alice", body: "reply" }],
        }],
        changes: [],
        discussions: [],
      }],
    }));

    const first = createInMemoryCommunityApi({ persistencePath });
    const migrated = await first.getRepository("epoch/epoch");
    const issueObjectId = migrated.issues[0]?.ref?.objectId;
    const commentObjectId = migrated.issues[0]?.comments[0]?.ref?.objectId;
    assert.ok(issueObjectId);
    assert.ok(commentObjectId);
    assert.equal((await first.getObject(issueObjectId)).title, "Migrated");
    assert.equal((await first.listThreadRelations(commentObjectId)).parent?.objectId, issueObjectId);
    assert.equal(JSON.parse(readFileSync(persistencePath, "utf8")).schemaVersion, 3);

    const second = createInMemoryCommunityApi({ persistencePath });
    const reloaded = await second.getRepository("epoch/epoch");
    assert.equal(reloaded.issues[0]?.ref?.objectId, issueObjectId);
    assert.equal(reloaded.issues[0]?.comments[0]?.ref?.objectId, commentObjectId);
    assert.equal(reloaded.issues[0]?.comments[0]?.body, "reply");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function savedViewIdentityMigratesOnce(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-api-projection-kind-"));
  const persistencePath = join(directory, "state.json");
  try {
    const projectionRef = { objectId: "projection-old", kind: "saved-view" };
    writeFileSync(persistencePath, JSON.stringify({
      schemaVersion: 2,
      repositories: [],
      objects: [{
        ref: projectionRef,
        context: { objectId: "channel-general", kind: "channel" },
        authorId: "alice",
        body: "projection definition",
        publishedAt: "2026-08-11T00:00:00.000Z",
        threadRoot: projectionRef,
        relations: [],
        state: "read",
        aliases: ["old-projection"],
      }],
      projections: [],
    }));
    const first = createInMemoryCommunityApi({ persistencePath });
    assert.equal((await first.getObject("projection-old")).ref.kind, "projection");
    const persisted = JSON.parse(readFileSync(persistencePath, "utf8"));
    assert.equal(persisted.entities[0].ref.kind, "projection");
    assert.equal((await createInMemoryCommunityApi({ persistencePath }).getObject("projection-old")).ref.kind, "projection");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function flatProjectionFacadeIsAbsent(): void {
  const api = createInMemoryCommunityApi({ messages: [sampleMessage()] });
  for (const method of ["listProjections", "getProjection", "saveProjection", "deleteProjection"]) {
    assert.equal(method in api, false, `${method} must not compete with the ProjectionDefinition service`);
  }
}

function changeVocabularyIsCanonical(): void {
  const api = createInMemoryCommunityApi();
  assert.equal(typeof api.createChange, "function");
  assert.equal("proposeChange" in api, false);
}

async function malformedPersistenceFailsAtBoundary(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-api-invalid-"));
  const persistencePath = join(directory, "state.json");
  try {
    for (const malformed of [null, 7, [], {}]) {
      writeFileSync(persistencePath, JSON.stringify(malformed));
      assert.throws(() => createInMemoryCommunityApi({ persistencePath }), /persistence|schema/u);
    }
    for (const invalidMessage of [
      { ...sampleMessage(), context: undefined },
      { ...sampleMessage(), threadRoot: { objectId: "bad/id", kind: "message" } },
      { ...sampleMessage(), inReplyTo: { objectId: "bad/id", kind: "message" } },
    ]) {
      writeFileSync(persistencePath, JSON.stringify({
        schemaVersion: 2, repositories: [], objects: [invalidMessage], projections: [],
      }));
      assert.throws(() => createInMemoryCommunityApi({ persistencePath }), /persistence|reference|objectId/u);
    }
    writeFileSync(persistencePath, JSON.stringify({
      schemaVersion: 2,
      repositories: [{
        ref: { objectId: "project-invalid", kind: "project" },
        slug: "epoch/invalid",
        displayName: "Invalid",
        description: "",
        visibility: "unexpected",
        defaultView: "main",
        maintainers: ["alice"],
        topics: [],
        issues: [],
        changes: [],
        discussions: [],
      }],
      objects: [],
      projections: [],
    }));
    assert.throws(() => createInMemoryCommunityApi({ persistencePath }), /visibility/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function persistenceWritesAtomically(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-api-atomic-"));
  const persistencePath = join(directory, "state.json");
  try {
    const api = createInMemoryCommunityApi({ persistencePath, messages: [sampleMessage()] });
    const firstInode = statSync(persistencePath).ino;
    await api.updateObjectState("m-api-1", "read", {
      actorId: "alice", permissions: ["object:state:write"],
    });
    assert.notEqual(statSync(persistencePath).ino, firstInode, "atomic rename replaces the persisted file");
    assert.equal(JSON.parse(readFileSync(persistencePath, "utf8")).entities[0].fields.state, "read");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function objectStateIsBoundedAndTimestamped(): Promise<void> {
  const api = createInMemoryCommunityApi({ messages: [sampleMessage()] });
  const authorization = { actorId: "alice", permissions: ["object:state:write" as const] };
  await assert.rejects(() => api.updateObjectState("m-api-1", "arbitrary-custom-state", authorization), /state/u);
  await assert.rejects(() => api.updateObjectState("m-api-1", "x".repeat(1024), authorization), /state/u);
  const updated = await api.updateObjectState("m-api-1", "read", authorization);
  assert.ok(updated.updatedAt);
  assert.equal(updated.state, "read");

  const repository = await api.createRepository({
    slug: "epoch/review", displayName: "Review", description: "", maintainers: ["alice"],
  });
  const created = await api.createChange(repository.slug, {
    id: "CHANGE-1", title: "Change", author: "alice", sourceView: "main", targetView: "next",
  });
  const changeRef = created.changes[0]?.ref;
  assert.ok(changeRef);
  await api.reviewChange(repository.slug, "CHANGE-1", { reviewer: "alice", decision: "approved" });
  assert.ok((await api.getObject(changeRef.objectId, { actorId: "alice" })).updatedAt);
}

async function privateRepositoryObjectsFailClosed(): Promise<void> {
  const unresolvedRef = { objectId: "unresolved-object", kind: "message" as const };
  const api = createInMemoryCommunityApi({ messages: [{
    ...sampleMessage(), ref: unresolvedRef, context: { objectId: "missing-project", kind: "project" }, threadRoot: unresolvedRef,
  }] });
  const privateRepository = await api.createRepository({
    slug: "epoch/private", displayName: "Private", description: "", visibility: "private", maintainers: ["alice"],
  });
  const privateWithIssue = await api.openIssue(privateRepository.slug, {
    id: "PRIVATE-1", title: "Secret", author: "alice",
  });
  const privateId = privateWithIssue.issues[0]?.ref?.objectId;
  assert.ok(privateId);
  await assert.rejects(() => api.getObject(privateId), /not found/u);
  await assert.rejects(() => api.getObject(privateId, { actorId: "mallory" }), /not found/u);
  assert.equal((await api.getObject(privateId, { actorId: "alice" })).ref.objectId, privateId);
  await assert.rejects(() => api.getObject(unresolvedRef.objectId, { actorId: "alice" }), /not found/u);

  const publicRepository = await api.createRepository({
    slug: "epoch/public", displayName: "Public", description: "", visibility: "public", maintainers: ["alice"],
  });
  const publicWithIssue = await api.openIssue(publicRepository.slug, {
    id: "PUBLIC-1", title: "Visible", author: "alice",
  });
  const publicId = publicWithIssue.issues[0]?.ref?.objectId;
  assert.ok(publicId);
  assert.equal((await api.getObject(publicId)).ref.objectId, publicId);
}

function sampleMessage(): CommunityMessage {
  const ref = { objectId: "m-api-1", kind: "message" as const };
  return {
    ref,
    context: { objectId: "channel-general", kind: "channel" },
    authorId: "alice",
    body: "private sentinel",
    publishedAt: "2026-08-11T00:00:00.000Z",
    threadRoot: ref,
    relations: [],
    state: "needs-review",
    aliases: ["legacy-message"],
  };
}
