import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Clock, IdGenerator } from "@epoch/community-core";
import { CommunityError } from "@epoch/community-core";
import { createJsonCommunityStateStore } from "../../packages/Epoch.Community.API/src/persistence";
import { migrateCommunityState, migrateLocalSavedViews } from "../../packages/Epoch.Community.API/src/migrations";
import { createMemoryCommunityStateStore } from "../../packages/Epoch.Community.API/src/store";
import type { CommunityStateV3 } from "../../packages/Epoch.Community.API/src/state-schema";

export async function runCommunityStateStoreTests(): Promise<void> {
  await test("schema 1 migration assigns stable identity and timestamps exactly once", schemaOneMigrationIsDeterministic);
  await test("schema 2 migration normalizes saved queries and quarantines invalid projections", schemaTwoProjectionMigrationRecovers);
  await test("Nightboard saved-view schemas migrate without becoming a second authority", localSavedViewsMigrate);
  await test("conflicting canonical duplicates fail with an exportable recovery report", conflictingDuplicatesFailClosed);
  await test("state-store writes commit atomically and thrown operations roll back", storeTransactionsAreAtomic);
  await test("state exports and imports are isolated validated copies", storeExportImportIsolated);
  await test("file persistence recovers an interrupted first publish without exposing half-state", interruptedFirstPublishRecovers);
  await test("file persistence keeps the committed state when a replacement is interrupted", interruptedReplacementKeepsCommittedState);
  await test("opening a legacy file publishes one deterministic schema migration", legacyFileMigratesOnce);
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

function schemaOne() {
  return {
    schemaVersion: 1,
    repositories: [{
      slug: "epoch/epoch",
      displayName: "Epoch",
      description: "preserved",
      visibility: "public",
      defaultView: "main",
      maintainers: ["alice"],
      topics: ["dvcs"],
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
  };
}

function schemaTwo() {
  const ref = { objectId: "m-api-1", kind: "message" as const };
  return {
    schemaVersion: 2,
    repositories: [],
    objects: [{
      ref,
      context: { objectId: "channel-general", kind: "channel" as const },
      authorId: "alice",
      body: "body",
      publishedAt: "2026-08-11T00:00:00.000Z",
      threadRoot: ref,
      relations: [],
      state: "needs-review",
      aliases: ["legacy-message"],
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

function schemaOneMigrationIsDeterministic(): void {
  const migrated = migrateCommunityState(schemaOne(), runtime());
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.metadata.migratedAt, "2026-08-12T17:00:00.000Z");
  assert.equal(migrated.metadata.migrationTimestamp, "2026-08-12T17:00:00.000Z");
  assert.equal(migrated.entities.length, 3, "repository, issue, and comment become canonical entities");
  assert.ok(migrated.entities.every((entity) => entity.createdAt === "2026-08-12T17:00:00.000Z"));
  assert.ok(migrated.entities.every((entity) => entity.ref.objectId.length > 0));
  assert.deepEqual(migrateCommunityState(migrated, runtime()), migrated, "v3 migration is idempotent");
}

function schemaTwoProjectionMigrationRecovers(): void {
  const migrated = migrateCommunityState(schemaTwo(), runtime());
  assert.equal(migrated.entities[0]?.ref.objectId, "m-api-1");
  assert.equal(migrated.entities[0]?.createdAt, "2026-08-11T00:00:00.000Z");
  assert.equal(migrated.projectionDefinitions.length, 1);
  const root = migrated.projectionDefinitions[0]?.definition.root;
  assert.equal(root?.kind, "literal");
  const select = root?.kind === "literal" ? root.children[0] : undefined;
  assert.equal(select?.kind, "select");
  assert.equal(select?.kind === "select" ? select.where?.kind : undefined, "compare");
  assert.equal(migrated.quarantinedDefinitions[0]?.projectionId, "unsafe/projection");
  assert.match(migrated.quarantinedDefinitions[0]?.reason ?? "", /projection/i);
}

function localSavedViewsMigrate(): void {
  const migrated = migrateLocalSavedViews({
    schemaVersion: 2,
    views: [{
      id: "review-view",
      name: "Review",
      ownerId: "alice",
      query: "state:needs-review sort:new",
      queryLanguageVersion: 0,
      visibility: "private",
      order: "new",
    }, { id: "unsafe/view", ownerId: "alice", query: "state:open" }],
  }, runtime());
  assert.equal(migrated.projectionDefinitions[0]?.definition.projectionId, "review-view");
  assert.equal(migrated.projectionDefinitions[0]?.definition.root.kind, "literal");
  assert.equal(migrated.quarantinedDefinitions[0]?.projectionId, "unsafe/view");
}

function conflictingDuplicatesFailClosed(): void {
  const legacy = schemaTwo();
  legacy.objects.push({ ...legacy.objects[0], body: "different" });
  assert.throws(() => migrateCommunityState(legacy, runtime()), (error) => {
    assert.ok(error instanceof CommunityError);
    assert.equal(error.code, "PERSISTENCE_MIGRATION");
    // SAFETY: Runtime checks or construction above establish { conflicts?: unknown[] } | undefined)?.conflicts?.length.
    assert.equal((error.details?.recovery as { conflicts?: unknown[] } | undefined)?.conflicts?.length, 1);
    assert.doesNotMatch(JSON.stringify(error.details), /different/u, "recovery details contain identifiers, not content");
    return true;
  });
}

async function storeTransactionsAreAtomic(): Promise<void> {
  const initial = migrateCommunityState(schemaTwo(), runtime());
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
  const store = createMemoryCommunityStateStore(migrateCommunityState(schemaTwo(), runtime()));
  const exported = await store.export();
  // SAFETY: Runtime checks or construction above establish unknown as { ref: { objectId: string } }[])[0]!.ref.objectId = "tampered".
  // SAFETY: Export tampering test mutates cloned entity refs before re-import.
  const entities = [...exported.entities] as { ref: { objectId: string } }[];
  entities[0]!.ref.objectId = "tampered";
  assert.equal(await store.read((snapshot) => snapshot.entity("m-api-1")?.ref.objectId), "m-api-1");
  const empty = emptyState();
  await store.import(empty);
  assert.equal(await store.read((snapshot) => snapshot.entities.length), 0);
}

async function interruptedFirstPublishRecovers(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-state-first-"));
  const file = join(directory, "state.json");
  try {
    const store = createJsonCommunityStateStore(file, migrateCommunityState(schemaTwo(), runtime()), {
      afterPendingWrite: () => { throw new Error("injected interruption"); },
    });
    await assert.rejects(() => store.write((transaction) => transaction.deleteEntity("m-api-1")), typedMigrationError);
    assert.equal(existsSync(file), false);
    assert.equal(existsSync(`${file}.pending`), true);
    const recovered = createJsonCommunityStateStore(file, undefined);
    assert.equal(await recovered.read((snapshot) => snapshot.entities.length), 0);
    assert.equal(existsSync(`${file}.pending`), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function interruptedReplacementKeepsCommittedState(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-state-replace-"));
  const file = join(directory, "state.json");
  try {
    const initial = migrateCommunityState(schemaTwo(), runtime());
    const first = createJsonCommunityStateStore(file, initial);
    await first.write(() => undefined);
    const interrupted = createJsonCommunityStateStore(file, undefined, {
      afterPendingWrite: () => { throw new Error("injected interruption"); },
    });
    await assert.rejects(() => interrupted.write((transaction) => transaction.deleteEntity("m-api-1")), typedMigrationError);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).entities.length, 1);
    const recovered = createJsonCommunityStateStore(file);
    assert.equal(await recovered.read((snapshot) => snapshot.entities.length), 1, "the committed primary wins over an interrupted replacement");
    assert.equal(existsSync(`${file}.pending`), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function legacyFileMigratesOnce(): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), "epoch-state-legacy-"));
  const file = join(directory, "state.json");
  try {
    writeFileSync(file, JSON.stringify(schemaOne()));
    const first = createJsonCommunityStateStore(file, undefined, { migrationContext: runtime() });
    const firstExport = await first.export();
    assert.equal(JSON.parse(readFileSync(file, "utf8")).schemaVersion, 3);
    const second = createJsonCommunityStateStore(file);
    assert.deepEqual(await second.export(), firstExport, "reload neither remints IDs nor timestamps");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function emptyState(): CommunityStateV3 {
  return {
    schemaVersion: 3,
    metadata: {
      createdAt: "2026-08-12T17:00:00.000Z",
      updatedAt: "2026-08-12T17:00:00.000Z",
      migratedAt: "2026-08-12T17:00:00.000Z",
      migrationTimestamp: "2026-08-12T17:00:00.000Z",
      sourceSchemaVersion: 3,
      migrationId: "migration-empty",
    },
    entities: [], relations: [], projectionDefinitions: [], namespaceMounts: [], sourceCheckpoints: [], quarantinedDefinitions: [],
  };
}

function typedMigrationError(error: Error): boolean {
  return error instanceof CommunityError && error.code === "PERSISTENCE_MIGRATION";
}
