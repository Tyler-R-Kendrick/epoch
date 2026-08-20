import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Clock, IdGenerator } from "@epoch/community-core";
import { CommunityError } from "@epoch/community-core";
import { createJsonCommunityStateStore } from "../../packages/Epoch.Community.API/src/persistence";
import { migrateCommunityState, migrateLocalSavedViews, seedCommunityState } from "../../packages/Epoch.Community.API/src/migrations";
import { createMemoryCommunityStateStore } from "../../packages/Epoch.Community.API/src/store";

export async function runCommunityStateStoreTests(): Promise<void> {
  await test("schema 1 and 2 persisted bags are refused", olderSchemasAreRefused);
  await test("seed bags become schema 3 with stable identity", seedBuildsCurrentSchema);
  await test("seed projections quarantine invalid definitions", seedProjectionQuarantine);
  await test("saved-view import requires current projection identity fields", localSavedViewsRequireProjectionIdentity);
  await test("conflicting seed duplicates fail with an exportable recovery report", conflictingDuplicatesFailClosed);
  await test("state-store writes commit atomically and thrown operations roll back", storeTransactionsAreAtomic);
  await test("state exports and imports are isolated validated copies", storeExportImportIsolated);
  await test("file persistence recovers an interrupted first publish without exposing half-state", interruptedFirstPublishRecovers);
  await test("file persistence keeps the committed state when a replacement is interrupted", interruptedReplacementKeepsCommittedState);
  await test("opening a schema 1 file fails closed without rewriting", olderFileIsRefused);
}

async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    throw new Error(name, { cause: error });
  }
}

function runtime() {
  let next = 0;
  const clock: Clock = { now: () => new Date("2026-08-12T17:00:00.000Z") };
  const idGenerator: IdGenerator = { generate: (namespace) => `${namespace}-${String(++next).padStart(4, "0")}` };
  return { clock, idGenerator, timezone: "UTC", locale: "en-US" };
}

function seedRepositories() {
  return [{
    slug: "epoch/epoch",
    displayName: "Epoch",
    description: "preserved",
    visibility: "public",
    defaultView: "main",
    maintainers: ["alice"],
    topics: ["dvcs"],
    issues: [{
      id: "ISSUE-1",
      title: "Seeded",
      author: "bob",
      body: "body",
      labels: [],
      status: "open",
      comments: [{ author: "alice", body: "reply" }],
    }],
    changeProposals: [],
    discussions: [],
  }];
}

function seedMessagesAndProjections() {
  const ref = { objectId: "m-api-1", kind: "message" as const };
  return {
    messages: [{
      ref,
      context: { objectId: "channel-general", kind: "channel" as const },
      authorId: "alice",
      body: "body",
      publishedAt: "2026-08-11T00:00:00.000Z",
      threadRoot: ref,
      relations: [],
      state: "needs-review",
      aliases: ["seed-message"],
    }],
    projections: [{
      projectionId: "saved-needs-review",
      kind: "saved-query",
      label: "Needs review",
      root: { objectId: "channel-general", kind: "channel" },
      parentRelation: "projection",
      order: { by: "publishedAt", direction: "descending" },
      visibility: "private",
      query: {
        ast: { op: "field", field: "id", value: "m-api-1", phrase: false },
        canonical: "id:m-api-1",
        sort: null,
        version: 1,
      },
      queryLanguageVersion: 1,
      ownerId: "alice",
      createdAt: "2026-08-11T01:00:00.000Z",
      updatedAt: "2026-08-11T01:00:00.000Z",
      version: 1,
    }, {
      projectionId: "unsafe/projection",
      kind: "saved-query",
      label: "Recover me",
      ownerId: "alice",
      version: 1,
    }],
  };
}

function olderSchemasAreRefused(): void {
  assert.throws(() => migrateCommunityState({ schemaVersion: 1, repositories: [] }, runtime()), /schema version 3/i);
  assert.throws(() => migrateCommunityState({
    schemaVersion: 2, repositories: [], objects: [], projections: [],
  }, runtime()), /schema version 3/i);
}

function seedBuildsCurrentSchema(): void {
  const seeded = seedCommunityState({ repositories: seedRepositories() }, runtime());
  assert.equal(seeded.schemaVersion, 3);
  assert.equal(seeded.metadata.sourceSchemaVersion, 3);
  assert.equal(seeded.metadata.migratedAt, "2026-08-12T17:00:00.000Z");
  assert.equal(seeded.entities.length, 3, "repository, issue, and comment become canonical entities");
  assert.ok(seeded.entities.every((entity) => entity.createdAt === "2026-08-12T17:00:00.000Z"));
  assert.deepEqual(migrateCommunityState(seeded, runtime()), seeded, "schema 3 load is idempotent");
}

function seedProjectionQuarantine(): void {
  const seeded = seedCommunityState(seedMessagesAndProjections(), runtime());
  assert.equal(seeded.entities[0]?.ref.objectId, "m-api-1");
  assert.equal(seeded.entities[0]?.createdAt, "2026-08-11T00:00:00.000Z");
  assert.equal(seeded.projectionDefinitions.length, 1);
  assert.equal(seeded.quarantinedDefinitions[0]?.projectionId, "unsafe/projection");
  assert.match(seeded.quarantinedDefinitions[0]?.reason ?? "", /projection/i);
}

function localSavedViewsRequireProjectionIdentity(): void {
  const imported = migrateLocalSavedViews({
    views: [{
      projectionId: "review-view",
      label: "Review",
      ownerId: "alice",
      query: "state:needs-review sort:new",
      queryLanguageVersion: 0,
      visibility: "private",
      order: "new",
      version: 1,
    }, { projectionId: "unsafe/view", label: "Bad", ownerId: "alice", query: "state:open", version: 1 }],
  }, runtime());
  assert.equal(imported.projectionDefinitions[0]?.definition.projectionId, "review-view");
  assert.equal(imported.quarantinedDefinitions[0]?.projectionId, "unsafe/view");
  const aliasesRejected = migrateLocalSavedViews({
    views: [{ id: "old-id", name: "Old", ownerId: "alice", query: "state:open", version: 1 }],
  }, runtime());
  assert.equal(aliasesRejected.projectionDefinitions.length, 0);
  assert.equal(aliasesRejected.quarantinedDefinitions.length, 1);
}

function conflictingDuplicatesFailClosed(): void {
  const bag = seedMessagesAndProjections();
  bag.messages.push({ ...bag.messages[0], body: "different" });
  assert.throws(() => seedCommunityState(bag, runtime()), (error) => {
    assert.ok(error instanceof CommunityError);
    assert.equal(error.code, "PERSISTENCE_MIGRATION");
    // SAFETY: Runtime checks or construction above establish { conflicts?: unknown[] } | undefined)?.conflicts?.length.
    assert.equal((error.details?.recovery as { conflicts?: unknown[] } | undefined)?.conflicts?.length, 1);
    assert.doesNotMatch(JSON.stringify(error.details), /different/u, "recovery details contain identifiers, not content");
    return true;
  });
}

async function storeTransactionsAreAtomic(): Promise<void> {
  const initial = seedCommunityState(seedMessagesAndProjections(), runtime());
  const store = createMemoryCommunityStateStore(initial);
  await assert.rejects(() => store.write((transaction) => {
    transaction.deleteEntity("m-api-1");
    throw new Error("stop");
  }), /stop/u);
  assert.equal(await store.read((snapshot) => snapshot.entity("m-api-1")?.ref.objectId), "m-api-1");
  await store.write((transaction) => transaction.deleteEntity("m-api-1"));
  assert.equal(await store.read((snapshot) => snapshot.entity("m-api-1")), undefined);
}

async function storeExportImportIsolated(): Promise<void> {
  const store = createMemoryCommunityStateStore(seedCommunityState(seedMessagesAndProjections(), runtime()));
  const exported = await store.export();
  // SAFETY: Mutating a structuredClone export proves isolation from the live store.
  const mutated = structuredClone(exported);
  // SAFETY: Clone is owned by the test and mutable for isolation assertions.
  (mutated.entities[0]!.fields as { state: string }).state = "mutated";
  assert.equal(await store.read((snapshot) => snapshot.entity("m-api-1")?.fields.state), "needs-review");
  const other = createMemoryCommunityStateStore(seedCommunityState({ repositories: [] }, runtime()));
  await other.import(await store.export());
  assert.equal(await other.read((snapshot) => snapshot.entity("m-api-1")?.ref.objectId), "m-api-1");
}

async function interruptedFirstPublishRecovers(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-state-first-"));
  const file = join(directory, "state.json");
  try {
    const store = createJsonCommunityStateStore(file, seedCommunityState(seedMessagesAndProjections(), runtime()), {
      migrationContext: runtime(),
      afterPendingWrite: () => {
        throw new Error("crash after pending");
      },
    });
    await assert.rejects(() => store.write((transaction) => {
      transaction.deleteEntity("m-api-1");
    }), /crash after pending|interrupted/i);
    assert.equal(existsSync(`${file}.pending`), true);
    const recovered = createJsonCommunityStateStore(file, undefined, { migrationContext: runtime() });
    assert.equal(await recovered.read((snapshot) => snapshot.entity("m-api-1")), undefined);
    assert.equal(existsSync(`${file}.pending`), false);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).schemaVersion, 3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function interruptedReplacementKeepsCommittedState(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-state-replace-"));
  const file = join(directory, "state.json");
  try {
    const initial = seedCommunityState(seedMessagesAndProjections(), runtime());
    writeFileSync(file, `${JSON.stringify(initial, null, 2)}\n`);
    const store = createJsonCommunityStateStore(file, undefined, {
      migrationContext: runtime(),
      afterPendingWrite: () => {
        throw new Error("crash mid replace");
      },
    });
    await assert.rejects(() => store.write((transaction) => {
      transaction.deleteEntity("m-api-1");
    }), /crash mid replace|interrupted/i);
    const reopened = createJsonCommunityStateStore(file, undefined, { migrationContext: runtime() });
    assert.equal(await reopened.read((snapshot) => snapshot.entity("m-api-1")?.ref.objectId), "m-api-1");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function olderFileIsRefused(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-state-old-"));
  const file = join(directory, "state.json");
  try {
    writeFileSync(file, JSON.stringify({ schemaVersion: 1, repositories: [] }));
    assert.throws(() => createJsonCommunityStateStore(file, undefined, { migrationContext: runtime() }), /schema version 3/i);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).schemaVersion, 1, "refused open must not rewrite the file");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
