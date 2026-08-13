import {
  CommunityError,
  type CommunityEntity,
  type CommunityFieldScalar,
  type CommunitySearchChangeSet,
  type SearchExpression,
} from "@epoch/community-core";
import {
  initializeSqliteIndex,
  translateSearchExpressionToSql,
  type SqliteIndexPort,
  type SqliteStatementDatabase,
} from "./sqlite-wasm-backend";
import { mapSqlitePersistenceError, type SqliteStorageMode } from "./persistence-coordinator";

type WorkerOperation =
  | { readonly type: "health" }
  | { readonly type: "apply"; readonly changes: CommunitySearchChangeSet }
  | { readonly type: "replace"; readonly entities: readonly CommunityEntity[] }
  | { readonly type: "query"; readonly expression: SearchExpression; readonly allowedObjectIds: readonly string[] }
  | { readonly type: "export" }
  | { readonly type: "reset" }
  | { readonly type: "close" };

interface WorkerRequest { readonly requestId: number; readonly operation: WorkerOperation }
interface WorkerCancel { readonly type: "cancel"; readonly requestId: number }
interface WorkerResponse {
  readonly requestId: number;
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}

export interface SqliteWorkerLike {
  onmessage: ((event: MessageEvent<Record<string, unknown>>) => void) | null;
  postMessage(message: Readonly<Record<string, unknown>>): void;
  terminate(): void;
}

export interface SqliteWorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest | WorkerCancel>) => void) | null;
  postMessage(message: WorkerResponse, transfer?: readonly Transferable[]): void;
}

export class SqliteWorkerClient implements SqliteIndexPort {
  readonly #worker: SqliteWorkerLike;
  readonly #pending = new Map<number, { resolve(value: unknown): void; reject(error: unknown): void; cleanup(): void }>();
  #nextRequestId = 1;

  constructor(worker: SqliteWorkerLike) {
    this.#worker = worker;
    worker.onmessage = (event) => this.#receive(parseWorkerResponse(event.data));
  }

  request<T = unknown>(operation: WorkerOperation, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted === true) return Promise.reject(abortError());
    const requestId = this.#nextRequestId++;
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        this.#pending.delete(requestId);
        this.#worker.postMessage({ type: "cancel", requestId });
        reject(abortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.#pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        cleanup: () => signal?.removeEventListener("abort", onAbort),
      });
      this.#worker.postMessage({ requestId, operation });
    });
  }

  async apply(changes: CommunitySearchChangeSet): Promise<void> { await this.request({ type: "apply", changes }); }
  async replace(entities: readonly CommunityEntity[]): Promise<void> { await this.request({ type: "replace", entities }); }
  async query(input: { readonly expression: SearchExpression; readonly allowedObjectIds: readonly string[]; readonly signal?: AbortSignal }): Promise<readonly string[]> {
    return await this.request({ type: "query", expression: input.expression, allowedObjectIds: input.allowedObjectIds }, input.signal);
  }
  async export(): Promise<Uint8Array> { return await this.request({ type: "export" }); }
  async reset(): Promise<void> { await this.request({ type: "reset" }); }
  async close(): Promise<void> {
    try { await this.request({ type: "close" }); } finally { this.#worker.terminate(); }
  }

  #receive(response: WorkerResponse): void {
    const pending = this.#pending.get(response.requestId);
    if (pending === undefined) return;
    this.#pending.delete(response.requestId);
    pending.cleanup();
    if (response.ok) pending.resolve(response.value);
    else pending.reject(new CommunityError(asErrorCode(response.error?.code), response.error?.message ?? "SQLite Worker request failed"));
  }
}

export async function startSqliteWorker(
  scope: SqliteWorkerScope,
  options: { readonly storageMode: SqliteStorageMode; readonly filename?: string },
): Promise<void> {
  const { default: initSqlite3 } = await import("@sqlite.org/sqlite-wasm");
  const sqlite3 = await initSqlite3();
  const raw = await openDatabase(sqlite3 as unknown as SqliteRuntime, options.storageMode, options.filename);
  const database = createSqliteStatementDatabase(raw);
  let health = await initializeSqliteIndex(database, { storageMode: options.storageMode });
  const cancelled = new Set<number>();
  scope.onmessage = (event) => {
    const message = event.data;
    if (!("operation" in message)) {
      cancelled.add(message.requestId);
      return;
    }
    void execute(message.requestId, message.operation).then(
      (value) => respond(scope, { requestId: message.requestId, ok: true, value }),
      (error: unknown) => {
        const typed = mapSqlitePersistenceError(error);
        respond(scope, { requestId: message.requestId, ok: false, error: { code: typed.code, message: typed.message } });
      },
    ).finally(() => cancelled.delete(message.requestId));
  };

  async function execute(requestId: number, operation: WorkerOperation): Promise<unknown> {
    assertNotCancelled(requestId, cancelled);
    switch (operation.type) {
      case "health": return health;
      case "apply": applyChangeSet(database, operation.changes, () => assertNotCancelled(requestId, cancelled)); return undefined;
      case "replace": replaceEntities(database, operation.entities, () => assertNotCancelled(requestId, cancelled)); return undefined;
      case "query": {
        const translated = translateSearchExpressionToSql(operation.expression, operation.allowedObjectIds);
        assertNotCancelled(requestId, cancelled);
        return database.rows(translated.sql, translated.parameters).map((row) => String(row.object_id));
      }
      case "export": return database.export?.() ?? new Uint8Array();
      case "reset":
        resetIndex(database);
        health = await initializeSqliteIndex(database, { storageMode: options.storageMode });
        return health;
      case "close": database.close(); return undefined;
    }
  }
}

export function createSqliteWorker(
  url: string | URL,
  options: WorkerOptions = { type: "module", name: "epoch-community-sqlite" },
): SqliteWorkerClient {
  return new SqliteWorkerClient(new Worker(url, options));
}

interface SqliteRuntime {
  readonly oo1: {
    readonly DB: new (filename: string, flags?: string) => SqliteRawDatabase;
    readonly OpfsDb?: new (filename: string, flags?: string) => SqliteRawDatabase;
    readonly OpfsWlDb?: new (filename: string, flags?: string) => SqliteRawDatabase;
    readonly OpfsSAHPoolDb?: new (filename: string, flags?: string) => SqliteRawDatabase;
  };
  installOpfsSAHPoolVfs?(options?: Readonly<Record<string, unknown>>): Promise<unknown>;
  readonly capi?: { sqlite3_js_db_export?(database: SqliteRawDatabase): Uint8Array };
}

export interface SqliteRawDatabase {
  exec(options: string | {
    readonly sql: string;
    readonly bind?: readonly (CommunityFieldScalar | Uint8Array)[];
    readonly rowMode?: "object" | "$";
    readonly returnValue?: "resultRows";
    readonly resultRows?: Readonly<Record<string, unknown>>[];
  }): unknown;
  selectValue?(sql: string, bind?: readonly (CommunityFieldScalar | Uint8Array)[]): unknown;
  export?(): Uint8Array;
  close(): void;
}

async function openDatabase(runtime: SqliteRuntime, mode: SqliteStorageMode, filename = "/epoch-community-search.sqlite3"): Promise<SqliteRawDatabase> {
  if (mode === "memory") return new runtime.oo1.DB(":memory:", "c");
  if (mode === "opfs-wl") {
    if (runtime.oo1.OpfsWlDb === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "SQLite OPFS-WL is unavailable");
    return new runtime.oo1.OpfsWlDb(filename, "c");
  }
  if (mode === "opfs-sahpool") {
    await runtime.installOpfsSAHPoolVfs?.({ name: "epoch-opfs-sahpool" });
    if (runtime.oo1.OpfsSAHPoolDb === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "SQLite OPFS SAH pool is unavailable");
    return new runtime.oo1.OpfsSAHPoolDb(filename, "c");
  }
  if (runtime.oo1.OpfsDb === undefined) throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "SQLite OPFS is unavailable");
  return new runtime.oo1.OpfsDb(filename, "c");
}

export function createSqliteStatementDatabase(raw: SqliteRawDatabase): SqliteStatementDatabase {
  return {
    value(sql, parameters = []) {
      if (raw.selectValue !== undefined) return parameters.length === 0 ? raw.selectValue(sql) : raw.selectValue(sql, parameters);
      return this.rows(sql, parameters)[0]?.value;
    },
    execute(sql, parameters = []) { raw.exec(parameters.length === 0 ? { sql } : { sql, bind: parameters }); },
    rows(sql, parameters = []) {
      const rows: Readonly<Record<string, unknown>>[] = [];
      raw.exec(parameters.length === 0
        ? { sql, rowMode: "object", returnValue: "resultRows", resultRows: rows }
        : { sql, bind: parameters, rowMode: "object", returnValue: "resultRows", resultRows: rows });
      return rows;
    },
    export: raw.export === undefined ? undefined : () => raw.export?.() ?? new Uint8Array(),
    close() { raw.close(); },
  };
}

function replaceEntities(database: SqliteStatementDatabase, entities: readonly CommunityEntity[], cancelled: () => void): void {
  database.execute("BEGIN IMMEDIATE");
  try {
    database.execute("DELETE FROM entity_fts");
    database.execute("DELETE FROM relation");
    database.execute("DELETE FROM entity_field");
    database.execute("DELETE FROM entity");
    for (const entity of entities) { cancelled(); writeEntity(database, entity); }
    database.execute("COMMIT");
  } catch (error) {
    try { database.execute("ROLLBACK"); } catch { /* Preserve original error. */ }
    throw error;
  }
}

function applyChangeSet(database: SqliteStatementDatabase, changes: CommunitySearchChangeSet, cancelled: () => void): void {
  database.execute("BEGIN IMMEDIATE");
  try {
    for (const ref of changes.deletes) { cancelled(); deleteEntity(database, ref.objectId); }
    for (const entity of changes.upserts) { cancelled(); deleteEntity(database, entity.ref.objectId); writeEntity(database, entity); }
    database.execute("INSERT INTO source_checkpoint(source_id, token, observed_at, status, detail) VALUES (?, ?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET token=excluded.token, observed_at=excluded.observed_at, status=excluded.status, detail=excluded.detail", [
      changes.sourceId, changes.checkpoint.token, changes.checkpoint.observedAt, changes.checkpoint.status, changes.checkpoint.detail ?? null,
    ]);
    database.execute("COMMIT");
  } catch (error) {
    try { database.execute("ROLLBACK"); } catch { /* Preserve original error. */ }
    throw error;
  }
}

function deleteEntity(database: SqliteStatementDatabase, objectId: string): void {
  database.execute("DELETE FROM entity_fts WHERE object_id = ?", [objectId]);
  database.execute("DELETE FROM relation WHERE source_id = ? OR target_id = ?", [objectId, objectId]);
  database.execute("DELETE FROM entity WHERE object_id = ?", [objectId]);
}

function writeEntity(database: SqliteStatementDatabase, entity: CommunityEntity): void {
  database.execute("INSERT INTO entity(object_id, kind, visibility, entity_json, updated_at) VALUES (?, ?, ?, ?, ?)", [
    entity.ref.objectId, entity.ref.kind, entity.visibility, JSON.stringify(entity), entity.updatedAt,
  ]);
  for (const [field, raw] of Object.entries(entity.fields)) {
    const values = Array.isArray(raw) ? raw : [raw];
    values.forEach((value, ordinal) => {
      database.execute("INSERT INTO entity_field(object_id, field_name, ordinal, text_value, number_value, boolean_value, null_value) VALUES (?, ?, ?, ?, ?, ?, ?)", [
        entity.ref.objectId,
        field,
        ordinal,
        typeof value === "string" ? value : null,
        typeof value === "number" ? value : null,
        typeof value === "boolean" ? Number(value) : null,
        value === null ? 1 : null,
      ]);
    });
  }
  for (const relation of entity.relations) database.execute(
    "INSERT OR IGNORE INTO relation(source_id, relation_type, target_id) VALUES (?, ?, ?)",
    [relation.source.objectId, relation.type, relation.target.objectId],
  );
  database.execute("INSERT INTO entity_fts(object_id, title, body, text) VALUES (?, ?, ?, ?)", [
    entity.ref.objectId,
    entity.searchableText.title ?? "",
    entity.searchableText.body ?? "",
    entity.searchableText.text ?? Object.values(entity.searchableText).join(" "),
  ]);
}

function resetIndex(database: SqliteStatementDatabase): void {
  database.execute("BEGIN IMMEDIATE");
  try {
    database.execute("DROP TABLE IF EXISTS entity_fts");
    for (const table of ["relation", "entity_field", "entity", "source_checkpoint", "projection_definition", "namespace_mount", "query_history", "index_metadata"]) {
      database.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    database.execute("PRAGMA user_version = 0");
    database.execute("COMMIT");
  } catch (error) {
    try { database.execute("ROLLBACK"); } catch { /* Preserve original error. */ }
    throw error;
  }
}

function assertNotCancelled(requestId: number, cancelled: ReadonlySet<number>): void {
  if (cancelled.has(requestId)) throw abortError();
}

function respond(scope: SqliteWorkerScope, response: WorkerResponse): void {
  const transfers = response.value instanceof Uint8Array ? [response.value.buffer] : undefined;
  scope.postMessage(response, transfers);
}

function abortError(): DOMException { return new DOMException("The SQLite search request was cancelled", "AbortError"); }

function asErrorCode(code: string | undefined): CommunityError["code"] {
  const allowed: readonly CommunityError["code"][] = ["QUERY_UNSUPPORTED_SOURCE", "QUERY_COST_LIMIT", "INDEX_STALE", "INDEX_LOCKED", "INDEX_QUOTA", "PERSISTENCE_MIGRATION", "INTERNAL"];
  return allowed.includes(code as CommunityError["code"]) ? code as CommunityError["code"] : "INTERNAL";
}

function parseWorkerResponse(value: Readonly<Record<string, unknown>>): WorkerResponse {
  const requestId = value.requestId;
  const ok = value.ok;
  if (!Number.isSafeInteger(requestId) || typeof ok !== "boolean") {
    throw new CommunityError("INTERNAL", "SQLite Worker returned a malformed response");
  }
  const error = value.error;
  return {
    requestId: requestId as number,
    ok,
    ...(value.value === undefined ? {} : { value: value.value }),
    ...(isErrorEnvelope(error) ? { error } : {}),
  };
}

function isErrorEnvelope(value: unknown): value is { readonly code: string; readonly message: string } {
  return typeof value === "object" && value !== null
    && typeof (value as { code?: unknown }).code === "string"
    && typeof (value as { message?: unknown }).message === "string";
}
