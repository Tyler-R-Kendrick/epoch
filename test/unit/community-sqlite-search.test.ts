import assert from "node:assert/strict";
import {
  createCommunityFieldRegistry,
  createSearchPlan,
  CommunityError,
  ReferenceSearchBackend,
  validateCommunityEntity,
  type CommunityEntity,
  type CommunitySearchChangeSet,
  type SearchPlan,
  type SearchSnapshot,
} from "@epoch/community-core";
import {
  SQLITE_INDEX_SCHEMA_VERSION,
  SqliteWasmSearchBackend,
  createSqliteWasmSearchBackend,
  initializeSqliteIndex,
  translateSearchExpressionToSql,
  type SqliteIndexPort,
  type SqliteStatementDatabase,
} from "../../packages/Epoch.Community.Web/src/search/sqlite-wasm-backend";
import {
  BrowserPersistenceCoordinator,
  chooseSqliteStorage,
  mapSqlitePersistenceError,
  type ExclusiveLockManager,
} from "../../packages/Epoch.Community.Web/src/search/persistence-coordinator";
import {
  SqliteWorkerClient,
  type SqliteWorkerLike,
} from "../../packages/Epoch.Community.Web/src/search/sqlite-worker";

type TestJsonValue = boolean | null | number | string | TestJsonObject | readonly TestJsonValue[] | undefined;
interface TestJsonObject {
  readonly [key: string]: TestJsonValue;
}

const NOW = "2026-08-12T20:00:00.000Z";
const REGISTRY = createCommunityFieldRegistry();

export async function runCommunitySqliteSearchTests(): Promise<void> {
  translatorUsesParametersAndEscapesFtsSyntax();
  storageSelectionIsExplicitAndTruthful();
  await schemaInitializationChecksFtsAndMigrates();
  await persistenceCoordinatorRejectsSecondWriter();
  workerCancellationRejectsAndCleansPendingRequest();
  workerResponsesCompleteRequests();
  persistenceErrorsAreTyped();
  await sqliteBackendMatchesReferenceForSupportedQueries();
  await unavailableSqliteFallsBackWithoutLosingEntities();
}

function translatorUsesParametersAndEscapesFtsSyntax(): void {
  const sentinel = `x" OR secret:*`;
  const translated = translateSearchExpressionToSql({
    kind: "and",
    terms: [
      { kind: "text", fields: ["title", "body"], value: sentinel, mode: "phrase" },
      { kind: "compare", field: "state", operator: "eq", value: `open' OR 1=1 --` },
      { kind: "range", field: "score", lower: 10, upper: 100, includeLower: true, includeUpper: false },
    ],
  }, ["issue-a", "issue-b"]);
  assert.doesNotMatch(translated.sql, /secret|1=1|open/u);
  assert.ok(translated.parameters.includes(`"x"" OR secret:*"`));
  assert.ok(translated.parameters.includes("open' OR 1=1 --"));
  assert.match(translated.sql, /title MATCH \?/u);
  assert.match(translated.sql, /field\.number_value >= \?/u);
  assert.equal(translated.authorizationCount, 2);
  assert.throws(() => translateSearchExpressionToSql({
    kind: "text", fields: ["unknown"], value: "value", mode: "term",
  }, ["issue-a"]), /unsupported/u);
}

function storageSelectionIsExplicitAndTruthful(): void {
  assert.deepEqual(chooseSqliteStorage({ opfs: false, crossOriginIsolated: false, sharedArrayBuffer: false }), {
    mode: "memory",
    persistent: false,
    reason: "OPFS is unavailable",
  });
  assert.deepEqual(chooseSqliteStorage({ opfs: true, crossOriginIsolated: false, sharedArrayBuffer: false }), {
    mode: "opfs-sahpool",
    persistent: true,
  });
  assert.deepEqual(chooseSqliteStorage({ opfs: true, crossOriginIsolated: true, sharedArrayBuffer: true }), {
    mode: "opfs-wl",
    persistent: true,
  });
  assert.throws(() => chooseSqliteStorage({
    opfs: false, crossOriginIsolated: false, sharedArrayBuffer: false,
  }, { requirePersistence: true }), /OPFS/u);
}

async function schemaInitializationChecksFtsAndMigrates(): Promise<void> {
  const db = new RecordingDatabase(1);
  const health = await initializeSqliteIndex(db, { storageMode: "memory" });
  assert.equal(health.fts5, true);
  assert.equal(health.schemaVersion, SQLITE_INDEX_SCHEMA_VERSION);
  assert.ok(db.sql.some((value) => /CREATE VIRTUAL TABLE IF NOT EXISTS entity_fts USING fts5/u.test(value)));
  assert.ok(db.sql.some((value) => /CREATE TABLE IF NOT EXISTS source_checkpoint/u.test(value)));
  assert.ok(db.sql.some((value) => /PRAGMA user_version =/u.test(value)));

  const unsupported = new RecordingDatabase(0);
  await assert.rejects(() => initializeSqliteIndex(unsupported, { storageMode: "memory" }),
    (error) => error instanceof CommunityError && error.code === "QUERY_UNSUPPORTED_SOURCE");
}

async function persistenceCoordinatorRejectsSecondWriter(): Promise<void> {
  const locks = new FakeLockManager();
  const first = new BrowserPersistenceCoordinator({ lockManager: locks, lockName: "epoch-index" });
  const second = new BrowserPersistenceCoordinator({ lockManager: locks, lockName: "epoch-index" });
  const lease = await first.acquireWriter();
  await assert.rejects(() => second.acquireWriter(),
    (error) => error instanceof CommunityError && error.code === "INDEX_LOCKED");
  await lease.release();
  const next = await second.acquireWriter();
  await next.release();
}

function workerCancellationRejectsAndCleansPendingRequest(): void {
  const worker = new FakeWorker();
  const client = new SqliteWorkerClient(worker);
  const controller = new AbortController();
  const pending = client.request({ type: "health" }, controller.signal);
  controller.abort();
  assert.equal(worker.messages.at(-1)?.type, "cancel");
  void assert.rejects(() => pending, (error) => error instanceof DOMException && error.name === "AbortError");
}

function workerResponsesCompleteRequests(): void {
  const worker = new FakeWorker();
  const client = new SqliteWorkerClient(worker);
  const pending = client.request({ type: "health" });
  const requestId = Number(worker.messages[0]?.requestId);
  worker.respond({ requestId, ok: true, value: { fts5: true } });
  void pending.then((health) => assert.deepEqual(health, { fts5: true }));
}

function persistenceErrorsAreTyped(): void {
  const quota = mapSqlitePersistenceError(new DOMException("full", "QuotaExceededError"));
  assert.equal(quota.code, "INDEX_QUOTA");
  const locked = mapSqlitePersistenceError(new DOMException("busy", "InvalidStateError"));
  assert.equal(locked.code, "INDEX_LOCKED");
  const stale = mapSqlitePersistenceError(new Error("migration failed"));
  assert.equal(stale.code, "INDEX_STALE");
}

async function sqliteBackendMatchesReferenceForSupportedQueries(): Promise<void> {
  const entities = corpus();
  const sqlitePort = new FakeIndexPort();
  const sqlite = new SqliteWasmSearchBackend({
    index: sqlitePort,
    registry: REGISTRY,
    cursorKey: new Uint8Array(32).fill(8),
  });
  const reference = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(8) });
  await sqlite.rebuild(entities);
  await reference.rebuild(entities);
  const incremental: CommunitySearchChangeSet = {
    sourceId: "test",
    checkpoint: { sourceId: "test", token: "2", observedAt: NOW, status: "current" },
    // SAFETY: Runtime checks or construction above establish CommunityEntity].
    upserts: [entities[0] as CommunityEntity],
    deletes: [],
    observedAt: NOW,
  };
  await sqlite.apply(incremental);
  await reference.apply(incremental);
  const plan = searchPlan({ kind: "text", fields: ["title"], value: "projection", mode: "term" });
  const [optimized, oracle] = await Promise.all([
    sqlite.search(plan, { first: 10 }),
    reference.search(plan, { first: 10 }),
  ]);
  assert.deepEqual(optimized.hits, oracle.hits);
  assert.deepEqual(await sqlite.facets(plan, ["state"]), await reference.facets(plan, ["state"]));
  assert.deepEqual(await sqlite.suggest({ plan, field: "title", prefix: "p", limit: 10 }),
    await reference.suggest({ plan, field: "title", prefix: "p", limit: 10 }));
  assert.equal(sqlitePort.lastQuery?.allowedObjectIds.includes("private-z"), false);
  assert.ok(sqlitePort.applied.length > 0);
  await sqlite.close();
  await reference.close();
}

async function unavailableSqliteFallsBackWithoutLosingEntities(): Promise<void> {
  const fallback = new ReferenceSearchBackend({ registry: REGISTRY, cursorKey: new Uint8Array(32).fill(9) });
  const selected = await createSqliteWasmSearchBackend({
    initialize: async () => { throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "FTS5 missing"); },
    fallback,
  });
  assert.equal(selected.mode, "reference-fallback");
  assert.equal(selected.reason, "FTS5 missing");
  await selected.backend.rebuild(corpus());
  const page = await selected.backend.search(searchPlan({ kind: "all" }), { first: 10 });
  assert.deepEqual(page.hits.map((hit) => hit.target.objectId), ["issue-b", "issue-a"]);
  await selected.backend.close();
}

class RecordingDatabase implements SqliteStatementDatabase {
  readonly sql: string[] = [];
  #userVersion = 0;
  constructor(private readonly fts5: number) {}
  value(sql: string): ReturnType<SqliteStatementDatabase["value"]> {
    this.sql.push(sql);
    if (/sqlite_compileoption_used/u.test(sql)) return this.fts5;
    if (/user_version/u.test(sql)) return this.#userVersion;
    return undefined;
  }
  execute(sql: string): void {
    this.sql.push(sql);
    const version = /PRAGMA user_version = (\d+)/u.exec(sql)?.[1];
    if (version !== undefined) this.#userVersion = Number(version);
  }
  rows(): readonly Readonly<TestJsonObject>[] { return []; }
  close(): void {}
}

class FakeLockManager implements ExclusiveLockManager {
  readonly held = new Set<string>();
  async acquire(name: string): Promise<undefined | (() => void)> {
    if (this.held.has(name)) return undefined;
    this.held.add(name);
    return () => { this.held.delete(name); };
  }
}

class FakeWorker implements SqliteWorkerLike {
  readonly messages: TestJsonObject[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage(message: TestJsonObject): void { this.messages.push(message); }
  // SAFETY: Runtime checks or construction above establish MessageEvent).
  respond(message: TestJsonObject): void { this.onmessage?.(/* SAFETY: Assertion is justified by surrounding validation or construction. */ { data: message } as MessageEvent); }
  terminate(): void {}
}

class FakeIndexPort implements SqliteIndexPort {
  readonly entities = new Map<string, CommunityEntity>();
  readonly applied: CommunitySearchChangeSet[] = [];
  lastQuery?: { readonly allowedObjectIds: readonly string[] };
  async apply(changes: CommunitySearchChangeSet): Promise<void> {
    this.applied.push(changes);
    for (const ref of changes.deletes) this.entities.delete(ref.objectId);
    for (const entity of changes.upserts) this.entities.set(entity.ref.objectId, entity);
  }
  async replace(entities: readonly CommunityEntity[]): Promise<void> {
    this.entities.clear();
    for (const entity of entities) this.entities.set(entity.ref.objectId, entity);
  }
  async query(input: { readonly allowedObjectIds: readonly string[] }): Promise<readonly string[]> {
    this.lastQuery = input;
    return input.allowedObjectIds.filter((id) => this.entities.has(id));
  }
  async export(): Promise<Uint8Array> { return new TextEncoder().encode("sqlite-index"); }
  async reset(): Promise<void> { this.entities.clear(); }
  async close(): Promise<void> {}
}

function corpus(): readonly CommunityEntity[] {
  return [
    entity("issue-a", "Projection parser", "open", "public", "2026-08-12T18:00:00.000Z"),
    entity("issue-b", "Projection runtime", "needs-review", "public", "2026-08-12T19:00:00.000Z"),
    entity("private-z", "Projection secret", "open", "private", "2026-08-12T20:00:00.000Z", "other"),
  ];
}

function entity(
  objectId: string,
  title: string,
  state: string,
  visibility: CommunityEntity["visibility"],
  updatedAt: string,
  ownerId = "maya",
): CommunityEntity {
  return validateCommunityEntity({
    ref: { objectId, kind: "issue" },
    fields: { objectId, kind: "issue", title, state, visibility, createdAt: NOW, updatedAt },
    searchableText: { title, body: title },
    relations: [],
    visibility,
    ownerId,
    participantIds: ownerId === "maya" ? ["maya"] : [],
    createdAt: NOW,
    updatedAt,
    provenance: { sourceId: "test", nativeId: objectId, observedAt: NOW },
  });
}

function searchPlan(expression: SearchPlan["expression"]): SearchPlan {
  const snapshot: SearchSnapshot = {
    snapshotId: "snapshot-sqlite",
    createdAt: NOW,
    resolvedNow: NOW,
    timezone: "UTC",
    locale: "en-US",
    queryHash: "query-sqlite",
    planHash: "pending",
    fieldRegistryVersion: REGISTRY.version,
    analyzerVersion: "epoch-tokenizer-v1",
    authorizationFingerprint: "sha256:maya",
    sourceCheckpoints: [{ sourceId: "store", token: "1", observedAt: NOW, status: "current" }],
  };
  return createSearchPlan({
    expression,
    order: [],
    sources: [],
    registry: REGISTRY,
    authorization: { actorId: "maya" },
    authorizationFingerprint: "sha256:maya",
    snapshot,
    limit: 100,
  });
}

if (require.main === module) {
  runCommunitySqliteSearchTests().then(
    () => console.log("community SQLite search tests passed"),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
