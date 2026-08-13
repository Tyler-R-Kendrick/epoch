import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CommunityError,
  assignProjectionCollisionNames,
  createKeysetCursorCodec,
  createNamespaceRuntime,
  InMemoryProjectionRuntime,
  normalizeQuery,
  type NamespaceMount,
  type ProjectionDataSource,
  type ProjectionDefinition,
  type VfsPage,
} from "@epoch/community-core";
import { migrateCommunityState, migrateLocalSavedViews } from "../../../packages/Epoch.Community.API/src/migrations";
import { createMemoryCommunityStateStore } from "../../../packages/Epoch.Community.API/src/store";
import { chooseSqliteStorage, mapSqlitePersistenceError } from "../../../packages/Epoch.Community.Web/src/search/persistence-coordinator";
import { BrowserPersistenceCoordinator, type ExclusiveLockManager } from "../../../packages/Epoch.Community.Web/src/search/persistence-coordinator";
import { translateSearchExpressionToSql } from "../../../packages/Epoch.Community.Web/src/search/sqlite-wasm-backend";
import { SqliteWorkerClient, type SqliteWorkerLike } from "../../../packages/Epoch.Community.Web/src/search/sqlite-worker";
import { COMMUNITY_GRAPHQL_SDL } from "../../../packages/Epoch.Community.GraphQL/src/schema";
import { FIXED_NOW, conformanceCorpus } from "../../conformance/community-search/fixture";

interface BrowserFaultFixture {
  readonly cases: readonly {
    readonly id: string;
    readonly capabilities?: { readonly opfs: boolean; readonly crossOriginIsolated: boolean; readonly sharedArrayBuffer: boolean };
    readonly expectedMode?: string;
    readonly domException?: string;
    readonly error?: string;
    readonly expectedCode?: string;
  }[];
  readonly ftsInjectionCorpus: readonly string[];
}

export async function runCommunitySearchAdversarialTests(): Promise<void> {
  parserFuzzIsBoundedDeterministicAndFailClosed();
  await cursorTamperingAndContextMismatchFailClosed();
  projectionOccurrencesAndCollisionsAreOrderIndependent();
  namespaceRecoveryAndMountOrderingAreInvariant();
  await migrationsAreIdempotentAndInterruptedWritesAreAtomic();
  browserFaultsAndFtsPayloadsAreExplicit();
  await workerCancellationAndMultiTabContentionFailClosed();
  graphqlIntrospectionContainsNoRegistrySecrets();
  deterministicSearchDoesNotImportAiOrNetworkExecution();
}

function parserFuzzIsBoundedDeterministicAndFailClosed(): void {
  const random = xorshift32(0x45504f43);
  const alphabet = [..."abcXYZ019_:-()[]{}*\\\"' ANDORNOT>=<", "é", "ｅ", "\0", "\n"];
  for (let iteration = 0; iteration < 2_000; iteration += 1) {
    const length = random() % 96;
    let input = "";
    for (let index = 0; index < length; index += 1) input += alphabet[random() % alphabet.length];
    const parsed = normalizeQuery(input, { now: FIXED_NOW, timezone: "UTC", locale: "en-US", actorId: "maya" });
    assert.ok(parsed.diagnostics.length <= 1);
    assert.ok(parsed.canonical.length <= 16_384);
    if (parsed.ast !== null) {
      const reparsed = normalizeQuery(parsed.canonical, { now: FIXED_NOW, timezone: "UTC", locale: "en-US", actorId: "maya" });
      assert.equal(reparsed.canonicalJson, parsed.canonicalJson);
      assert.equal(reparsed.queryHash, parsed.queryHash);
    }
  }
  const oversized = normalizeQuery("x".repeat(16_385), { now: FIXED_NOW });
  assert.equal(oversized.ast, null);
  assert.equal(oversized.diagnostics[0]?.code, "QUERY_TOO_LARGE");
}

async function cursorTamperingAndContextMismatchFailClosed(): Promise<void> {
  const codec = createKeysetCursorCodec({ key: new Uint8Array(32).fill(17), maxBytes: 512 });
  const binding = { snapshotId: "snapshot", planHash: "plan", authorizationFingerprint: "auth" };
  const cursor = await codec.encode({ version: 1, ...binding, sortKey: [FIXED_NOW, "issue", "issue-alpha"], objectId: "issue-alpha" });
  assert.doesNotMatch(cursor, /issue-alpha|snapshot|auth/u);
  await assert.rejects(() => codec.decode(`${cursor.slice(0, -2)}aa`, binding), hasCode("CURSOR_INVALID"));
  await assert.rejects(() => codec.decode(cursor, { ...binding, snapshotId: "other" }), hasCode("CURSOR_STALE"));
  await assert.rejects(() => codec.decode(cursor, { ...binding, authorizationFingerprint: "other" }), hasCode("CURSOR_STALE"));
  await assert.rejects(() => codec.decode("x".repeat(513), binding), hasCode("CURSOR_INVALID"));
}

function projectionOccurrencesAndCollisionsAreOrderIndependent(): void {
  const candidates = [
    { target: { objectId: "issue-alpha", kind: "issue" as const }, nodeId: "a", branchId: "left", originalSegment: "same", normalizedSegment: "same" },
    { target: { objectId: "issue-beta", kind: "issue" as const }, nodeId: "b", branchId: "right", originalSegment: "same", normalizedSegment: "same" },
  ];
  const forward = assignProjectionCollisionNames(candidates);
  const reverse = assignProjectionCollisionNames([...candidates].reverse());
  assert.deepEqual(new Map(forward.map((entry) => [entry.target.objectId, entry.finalName])), new Map(reverse.map((entry) => [entry.target.objectId, entry.finalName])));
  assert.notEqual(forward[0]?.finalName, forward[1]?.finalName);
  assert.throws(() => assignProjectionCollisionNames([candidates[0]!, candidates[0]!]), /duplicate occurrence/u);
}

function namespaceRecoveryAndMountOrderingAreInvariant(): void {
  const mounts: readonly NamespaceMount[] = [
    mount("workspace", "workspace", "workspace", 1),
    mount("user", "user", "user", 9),
    mount("session", "user", "session", 99),
  ];
  for (const order of permutations(mounts)) {
    const runtime = new InMemoryProjectionRuntime(emptyProjectionSource(), [projection("user"), projection("workspace")]);
    const namespace = createNamespaceRuntime(runtime);
    for (const item of order) namespace.mount(item);
    assert.deepEqual(namespace.mounts().map((item) => item.mountId), ["session", "user", "workspace", "builtin-root"]);
    assert.throws(() => namespace.mount({ ...mounts[0]!, mountId: "recovery-attack", mountPath: "/.epoch" }), hasCode("NAMESPACE_RECOVERY_PROTECTED"));
    assert.throws(() => namespace.unmount("recovery-default"), hasCode("NAMESPACE_RECOVERY_PROTECTED"));
    assert.deepEqual(namespace.reset("user").removedMountIds, ["user"]);
    assert.ok(namespace.mounts().some((item) => item.mountId === "builtin-root"));
  }
}

async function workerCancellationAndMultiTabContentionFailClosed(): Promise<void> {
  const locks = new TestLockManager();
  const first = new BrowserPersistenceCoordinator({ lockManager: locks, lockName: "community-index" });
  const second = new BrowserPersistenceCoordinator({ lockManager: locks, lockName: "community-index" });
  const lease = await first.acquireWriter();
  await assert.rejects(() => second.acquireWriter(), hasCode("INDEX_LOCKED"));
  await lease.release();
  await (await second.acquireWriter()).release();

  const worker = new TestWorker();
  const client = new SqliteWorkerClient(worker);
  const controller = new AbortController();
  const request = client.request({ type: "health" }, controller.signal);
  controller.abort();
  await assert.rejects(() => request, (error: unknown) => error instanceof DOMException && error.name === "AbortError");
  assert.equal(worker.messages.at(-1)?.type, "cancel");
}

async function migrationsAreIdempotentAndInterruptedWritesAreAtomic(): Promise<void> {
  const context = migrationContext();
  const legacy = { schemaVersion: 1, repositories: [] };
  const first = migrateCommunityState(legacy, context);
  assert.deepEqual(migrateCommunityState(first, context), first);
  const quarantined = migrateLocalSavedViews([{ id: "broken", query: "state:open", root: { kind: "script", source: "evil()" } }], context);
  assert.equal(quarantined.quarantinedDefinitions.length, 1);
  let persistCalls = 0;
  const store = createMemoryCommunityStateStore(first, {
    persist: async () => { persistCalls += 1; throw new Error("injected persistence failure"); },
  });
  const before = JSON.stringify(first);
  await assert.rejects(() => store.write((transaction) => transaction.putEntity(conformanceCorpus()[0]!)), /injected persistence/u);
  assert.equal(JSON.stringify(await store.export()), before);
  assert.equal(persistCalls, 1);
}

function browserFaultsAndFtsPayloadsAreExplicit(): void {
  const fixture = JSON.parse(readFileSync("test/adversarial/community-search/fixtures/browser-faults.json", "utf8")) as BrowserFaultFixture;
  for (const item of fixture.cases) {
    if (item.capabilities !== undefined) assert.equal(chooseSqliteStorage(item.capabilities).mode, item.expectedMode, item.id);
    if (item.domException !== undefined) assert.equal(mapSqlitePersistenceError(new DOMException(item.id, item.domException)).code, item.expectedCode, item.id);
    if (item.error !== undefined) assert.equal(mapSqlitePersistenceError(new Error(item.error)).code, item.expectedCode, item.id);
  }
  for (const payload of fixture.ftsInjectionCorpus) {
    const translation = translateSearchExpressionToSql({ kind: "text", fields: ["title"], value: payload, mode: "phrase" }, ["issue-alpha"]);
    assert.equal(translation.sql.includes(payload), false);
    assert.ok(translation.parameters.some((parameter) => typeof parameter === "string" && parameter.includes(payload.replaceAll('"', '""'))));
  }
}

function graphqlIntrospectionContainsNoRegistrySecrets(): void {
  assert.doesNotMatch(COMMUNITY_GRAPHQL_SDL, /dmId|DO_NOT_OBSERVE/u);
  assert.match(COMMUNITY_GRAPHQL_SDL, /input SearchExpressionInput @oneOf/u);
}

function deterministicSearchDoesNotImportAiOrNetworkExecution(): void {
  const files = [
    "packages/Epoch.Community.Core/src/query-parser.ts",
    "packages/Epoch.Community.Core/src/search-service.ts",
    "packages/Epoch.Community.Core/src/projection-runtime.ts",
    "packages/Epoch.Community.Web/src/search/orama-backend.ts",
    "packages/Epoch.Community.Web/src/search/sqlite-wasm-backend.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /openai|anthropic|generateText|model\.invoke|fetch\s*\(/iu, file);
  }
}

function projection(projectionId: string): ProjectionDefinition {
  return { apiVersion: "epoch.dev/v1alpha1", projectionId, version: 1, label: projectionId, visibility: "private", root: { nodeId: "root", kind: "literal", segment: "", children: [] }, order: [], updateMode: "live", consistency: "current" };
}

function mount(mountId: string, projectionId: string, scope: NamespaceMount["scope"], order: number): NamespaceMount {
  return { mountId, projectionId, scope, order, mountPath: "/", mode: "before", writable: false, createdAt: FIXED_NOW, updatedAt: FIXED_NOW };
}

function emptyProjectionSource(): ProjectionDataSource {
  const empty: VfsPage = { entries: [], pageInfo: { hasNextPage: false }, freshness: { status: "complete", sources: [], omittedSources: [], unsupportedPredicates: [] } };
  return { list: async () => empty, resolve: async () => undefined, locate: async () => [] };
}

function migrationContext() {
  return { clock: { now: () => new Date(FIXED_NOW) }, idGenerator: { generate: (namespace: string) => `${namespace}-fixed` }, timezone: "UTC", locale: "en-US" };
}

function hasCode(code: CommunityError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof CommunityError && error.code === code;
}

function xorshift32(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
}

function permutations<T>(values: readonly T[]): readonly (readonly T[])[] {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail]));
}

class TestLockManager implements ExclusiveLockManager {
  readonly #held = new Set<string>();
  async acquire(name: string): Promise<undefined | (() => void)> {
    if (this.#held.has(name)) return undefined;
    this.#held.add(name);
    return () => this.#held.delete(name);
  }
}

class TestWorker implements SqliteWorkerLike {
  readonly messages: Readonly<Record<string, unknown>>[] = [];
  onmessage: ((event: MessageEvent<Record<string, unknown>>) => void) | null = null;
  postMessage(message: Readonly<Record<string, unknown>>): void { this.messages.push(message); }
  terminate(): void {}
}

if (require.main === module) {
  runCommunitySearchAdversarialTests().then(
    () => console.log("community search adversarial tests passed"),
    (error: unknown) => { console.error(error); process.exitCode = 1; },
  );
}
