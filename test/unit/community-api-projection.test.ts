import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import type { CommunityMessage, ProjectionSpec } from "@epoch/community-core";

export async function runCommunityApiProjectionTests(): Promise<void> {
  await test("NAV-MIGRATE-001 API schema migration preserves data", apiMigrationPreservesDataAndAssignsIdsOnce);
  await test("NAV-QUERY-003 saved view visibility is enforced", savedProjectionAuthorizationFailsClosed);
  await test("NAV-PROJ-002 mutation through virtual view updates canonical object", projectionMutationUpdatesCanonicalObject);
  await test("NAV-PROJ-004 missing projection falls back to canonical object", deletedProjectionDoesNotDeleteCanonicalObject);
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
        changeProposals: [],
        discussions: [],
      }],
    }));

    const first = createInMemoryCommunityApi({ persistencePath });
    const migrated = await first.getRepository("epoch/epoch");
    const issueObjectId = migrated.issues[0]?.ref?.objectId;
    const commentObjectId = migrated.issues[0]?.comments[0]?.ref?.objectId;
    assert.ok(issueObjectId);
    assert.ok(commentObjectId);
    assert.equal(JSON.parse(readFileSync(persistencePath, "utf8")).schemaVersion, 2);

    const second = createInMemoryCommunityApi({ persistencePath });
    const reloaded = await second.getRepository("epoch/epoch");
    assert.equal(reloaded.issues[0]?.ref?.objectId, issueObjectId);
    assert.equal(reloaded.issues[0]?.comments[0]?.ref?.objectId, commentObjectId);
    assert.equal(reloaded.issues[0]?.comments[0]?.body, "reply");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function savedProjectionAuthorizationFailsClosed(): Promise<void> {
  const api = createInMemoryCommunityApi({ messages: [sampleMessage()] });
  const saved = await api.saveProjection({
    projection: sampleProjection("private"),
    ownerId: "alice",
  }, { actorId: "alice" });
  assert.equal(saved.ownerId, "alice");
  await assert.rejects(() => api.getProjection(saved.projectionId, { actorId: "mallory" }), /not found/u);
  assert.deepEqual(await api.listProjections({ actorId: "mallory" }), []);
}

async function projectionMutationUpdatesCanonicalObject(): Promise<void> {
  const api = createInMemoryCommunityApi({ messages: [sampleMessage()] });
  await api.saveProjection({ projection: sampleProjection("shared"), ownerId: "alice" }, { actorId: "alice" });
  await api.updateObjectState("m-api-1", "read", { actorId: "alice" });
  assert.equal((await api.getObject("m-api-1", { actorId: "alice" })).state, "read");
  assert.equal((await api.getProjection("saved-needs-review", { actorId: "alice" })).entries[0]?.ref.objectId, "m-api-1");
}

async function deletedProjectionDoesNotDeleteCanonicalObject(): Promise<void> {
  const api = createInMemoryCommunityApi({ messages: [sampleMessage()] });
  await api.saveProjection({ projection: sampleProjection("shared"), ownerId: "alice" }, { actorId: "alice" });
  await api.deleteProjection("saved-needs-review", { actorId: "alice" });
  await assert.rejects(() => api.getProjection("saved-needs-review", { actorId: "alice" }), /not found/u);
  assert.equal((await api.getObject("m-api-1", { actorId: "alice" })).ref.objectId, "m-api-1");
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

function sampleProjection(visibility: ProjectionSpec["visibility"]): ProjectionSpec {
  return {
    projectionId: "saved-needs-review",
    kind: "saved-query",
    label: "Needs review",
    root: { objectId: "channel-general", kind: "channel" },
    parentRelation: "projection",
    order: { by: "publishedAt", direction: "descending" },
    visibility,
    query: {
      ast: { op: "field", field: "state", value: "needs-review", phrase: false },
      canonical: "state:needs-review",
      sort: null,
      version: 1,
    },
    queryLanguageVersion: 1,
    version: 1,
  };
}
