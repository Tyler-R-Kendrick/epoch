import {
  CommunityError,
  ReferenceSearchBackend,
  type CommunityEntity,
  type CommunityFieldRegistry,
  type CommunityFieldScalar,
  type CommunitySearchChangeSet,
  type FacetResult,
  type PageRequest,
  type SearchBackend,
  type SearchExplanation,
  type SearchExpression,
  type SearchPage,
  type SearchPlan,
  type Suggestion,
  type SuggestRequest,
} from "@epoch/community-core";
import type { SqliteStorageMode } from "./persistence-coordinator";

export const SQLITE_INDEX_SCHEMA_VERSION = 1;
export const SQLITE_ANALYZER_VERSION = "epoch-sqlite-fts5-unicode61-v1";

type SqlParameter = CommunityFieldScalar | Uint8Array;

export interface SqliteStatementDatabase {
  value(sql: string, parameters?: readonly SqlParameter[]): unknown;
  execute(sql: string, parameters?: readonly SqlParameter[]): void;
  rows(sql: string, parameters?: readonly SqlParameter[]): readonly Readonly<Record<string, unknown>>[];
  export?(): Uint8Array;
  close(): void;
}

export interface SqliteIndexHealth {
  readonly fts5: boolean;
  readonly schemaVersion: number;
  readonly storageMode: SqliteStorageMode;
  readonly analyzerVersion: string;
}

export interface SqliteQueryTranslation {
  readonly sql: string;
  readonly parameters: readonly SqlParameter[];
  readonly authorizationCount: number;
}

export interface SqliteIndexPort {
  apply(changes: CommunitySearchChangeSet): Promise<void>;
  replace(entities: readonly CommunityEntity[]): Promise<void>;
  query(input: {
    readonly expression: SearchExpression;
    readonly allowedObjectIds: readonly string[];
    readonly signal?: AbortSignal;
  }): Promise<readonly string[]>;
  export(): Promise<Uint8Array>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function initializeSqliteIndex(
  database: SqliteStatementDatabase,
  options: { readonly storageMode: SqliteStorageMode },
): Promise<SqliteIndexHealth> {
  const fts5 = Number(database.value("SELECT sqlite_compileoption_used('ENABLE_FTS5')")) === 1;
  if (!fts5) {
    throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", "This SQLite WASM runtime does not provide FTS5");
  }
  const version = Number(database.value("PRAGMA user_version") ?? 0);
  if (!Number.isSafeInteger(version) || version < 0 || version > SQLITE_INDEX_SCHEMA_VERSION) {
    throw new CommunityError("PERSISTENCE_MIGRATION", `Unsupported SQLite search-index schema version: ${String(version)}`);
  }
  if (version < 1) {
    database.execute("BEGIN IMMEDIATE");
    try {
      for (const statement of SQLITE_SCHEMA_V1) database.execute(statement);
      database.execute(`PRAGMA user_version = ${SQLITE_INDEX_SCHEMA_VERSION}`);
      database.execute("COMMIT");
    } catch (error) {
      try { database.execute("ROLLBACK"); } catch { /* Preserve the migration failure. */ }
      throw new CommunityError("PERSISTENCE_MIGRATION", "Could not migrate the browser search index", undefined, { cause: error });
    }
  }
  return Object.freeze({
    fts5: true,
    schemaVersion: SQLITE_INDEX_SCHEMA_VERSION,
    storageMode: options.storageMode,
    analyzerVersion: SQLITE_ANALYZER_VERSION,
  });
}

export function translateSearchExpressionToSql(
  expression: SearchExpression,
  allowedObjectIds: readonly string[],
): SqliteQueryTranslation {
  if (allowedObjectIds.length > 10_000) throw new CommunityError("QUERY_COST_LIMIT", "SQLite candidate authorization set exceeds 10000 objects");
  const parameters: SqlParameter[] = [];
  const bind = (value: SqlParameter): string => { parameters.push(value); return "?"; };
  const authorization = allowedObjectIds.length === 0
    ? "0"
    : `entity.object_id IN (${allowedObjectIds.map((id) => bind(id)).join(", ")})`;
  const predicate = translateExpression(expression, bind);
  return Object.freeze({
    sql: `SELECT entity.object_id FROM entity WHERE ${authorization} AND (${predicate}) ORDER BY entity.object_id ASC`,
    parameters: Object.freeze(parameters),
    authorizationCount: allowedObjectIds.length,
  });
}

function translateExpression(expression: SearchExpression, bind: (value: SqlParameter) => string): string {
  switch (expression.kind) {
    case "all": return "1";
    case "and": return expression.terms.length === 0 ? "1" : expression.terms.map((term) => `(${translateExpression(term, bind)})`).join(" AND ");
    case "or": return expression.terms.length === 0 ? "0" : expression.terms.map((term) => `(${translateExpression(term, bind)})`).join(" OR ");
    case "not": return `NOT (${translateExpression(expression.term, bind)})`;
    case "exists":
      return `EXISTS (SELECT 1 FROM entity_field AS field WHERE field.object_id = entity.object_id AND field.field_name = ${bind(expression.field)})`;
    case "range": {
      const conditions = [`field.object_id = entity.object_id`, `field.field_name = ${bind(expression.field)}`];
      if (expression.lower !== undefined) conditions.push(`field.${valueColumn(expression.lower)} ${expression.includeLower ? ">=" : ">"} ${bind(expression.lower)}`);
      if (expression.upper !== undefined) conditions.push(`field.${valueColumn(expression.upper)} ${expression.includeUpper ? "<=" : "<"} ${bind(expression.upper)}`);
      return `EXISTS (SELECT 1 FROM entity_field AS field WHERE ${conditions.join(" AND ")})`;
    }
    case "compare": {
      const fieldParameter = bind(expression.field);
      const values = Array.isArray(expression.value) ? expression.value : [expression.value];
      const comparisons = values.map((value) => comparisonSql(value, expression.operator, bind));
      const joined = expression.operator === "ne" ? comparisons.join(" AND ") : comparisons.join(" OR ");
      return `EXISTS (SELECT 1 FROM entity_field AS field WHERE field.object_id = entity.object_id AND field.field_name = ${fieldParameter} AND (${joined}))`;
    }
    case "text": {
      const supported = new Set(["title", "body", "text"]);
      if (expression.fields.length === 0 || expression.fields.some((field) => !supported.has(field))) {
        throw new CommunityError("QUERY_UNSUPPORTED_SOURCE", `SQLite FTS5 fields are unsupported: ${expression.fields.join(", ")}`);
      }
      const value = fts5Query(expression.value, expression.mode);
      const matches = expression.fields.map((field) => `${field} MATCH ${bind(value)}`).join(" OR ");
      return `entity.object_id IN (SELECT object_id FROM entity_fts WHERE ${matches})`;
    }
    case "related": {
      const source = expression.direction === "out" ? "source_id" : "target_id";
      const target = expression.direction === "out" ? "target_id" : "source_id";
      return `EXISTS (SELECT 1 FROM relation WHERE relation.${source} = entity.object_id AND relation.relation_type = ${bind(expression.relation)} AND relation.${target} = ${bind(expression.target.objectId)})`;
    }
  }
}

function comparisonSql(
  value: CommunityFieldScalar,
  operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in",
  bind: (value: SqlParameter) => string,
): string {
  if (value === null) {
    if (operator !== "eq" && operator !== "ne" && operator !== "in") return "0";
    return `field.null_value ${operator === "ne" ? "IS NULL" : "IS NOT NULL"}`;
  }
  return `field.${valueColumn(value)} ${sqlOperator(operator)} ${bind(typeof value === "boolean" ? Number(value) : value)}`;
}

function sqlOperator(operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in"): string {
  switch (operator) {
    case "eq": case "in": return "=";
    case "ne": return "<>";
    case "lt": return "<";
    case "lte": return "<=";
    case "gt": return ">";
    case "gte": return ">=";
  }
}

function valueColumn(value: CommunityFieldScalar): "text_value" | "number_value" | "boolean_value" | "null_value" {
  if (value === null) return "null_value";
  if (typeof value === "number") return "number_value";
  if (typeof value === "boolean") return "boolean_value";
  return "text_value";
}

function fts5Query(value: string, mode: "term" | "phrase" | "prefix"): string {
  const escaped = value.normalize("NFC").replaceAll('"', '""');
  return expressionMode(escaped, mode);
}

function expressionMode(value: string, mode: "term" | "phrase" | "prefix"): string {
  if (mode === "prefix") return `"${value}"*`;
  return `"${value}"`;
}

export class SqliteWasmSearchBackend implements SearchBackend {
  readonly backendId = "epoch-sqlite-wasm";
  readonly backendVersion = `1/${SQLITE_ANALYZER_VERSION}`;
  readonly #index: SqliteIndexPort;
  readonly #registry: CommunityFieldRegistry;
  readonly #cursorKey: Uint8Array;
  readonly #entities = new Map<string, CommunityEntity>();
  #closed = false;

  constructor(options: {
    readonly index: SqliteIndexPort;
    readonly registry: CommunityFieldRegistry;
    readonly cursorKey: Uint8Array;
  }) {
    this.#index = options.index;
    this.#registry = options.registry;
    this.#cursorKey = options.cursorKey.slice();
  }

  async apply(changes: CommunitySearchChangeSet): Promise<void> {
    this.#ensureOpen();
    await this.#index.apply(changes);
    for (const ref of changes.deletes) this.#entities.delete(ref.objectId);
    for (const entity of changes.upserts) this.#entities.set(entity.ref.objectId, entity);
  }

  async rebuild(input: AsyncIterable<CommunityEntity> | Iterable<CommunityEntity>): Promise<void> {
    this.#ensureOpen();
    const entities: CommunityEntity[] = [];
    for await (const entity of input) entities.push(entity);
    await this.#index.replace(entities);
    this.#entities.clear();
    for (const entity of entities) this.#entities.set(entity.ref.objectId, entity);
  }

  async search(plan: SearchPlan, page: PageRequest, signal?: AbortSignal): Promise<SearchPage> {
    const backend = await this.#oracle(plan, signal);
    try { return await backend.search(plan, page, signal); } finally { await backend.close(); }
  }

  async facets(plan: SearchPlan, fields: readonly string[]): Promise<readonly FacetResult[]> {
    const backend = await this.#oracle(plan);
    try { return await backend.facets(plan, fields); } finally { await backend.close(); }
  }

  async suggest(input: SuggestRequest): Promise<readonly Suggestion[]> {
    const backend = await this.#oracle(input.plan);
    try { return await backend.suggest(input); } finally { await backend.close(); }
  }

  async explain(plan: SearchPlan): Promise<SearchExplanation> {
    return Object.freeze({
      planHash: plan.planHash,
      backendId: this.backendId,
      expression: JSON.parse(JSON.stringify(plan.expression)) as unknown,
      sourcePlans: Object.freeze(plan.sourcePlans.map((source) => ({
        sourceId: source.sourceId,
        pushdown: source.pushdown,
        residual: source.residual,
      }))),
      ordering: Object.freeze(plan.order.map((order) => `${order.field}:${order.direction}:${order.nulls}`)),
      authorization: "pre-filtered" as const,
    });
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#entities.clear();
    await this.#index.close();
  }

  async #oracle(plan: SearchPlan, signal?: AbortSignal): Promise<ReferenceSearchBackend> {
    this.#ensureOpen();
    assertNotAborted(signal);
    const allowedObjectIds = [...this.#entities.values()].filter(plan.canRead).map((entity) => entity.ref.objectId).sort();
    let ids: readonly string[];
    try {
      ids = await this.#index.query({ expression: plan.expression, allowedObjectIds, ...(signal === undefined ? {} : { signal }) });
    } catch (error) {
      if (!(error instanceof CommunityError) || error.code !== "QUERY_UNSUPPORTED_SOURCE") throw error;
      // The local database is an optimization, never semantic authority. A
      // predicate outside its exact pushdown surface is evaluated by Core.
      ids = allowedObjectIds;
    }
    assertNotAborted(signal);
    const backend = new ReferenceSearchBackend({ registry: this.#registry, cursorKey: this.#cursorKey });
    await backend.rebuild(ids.flatMap((id) => {
      const entity = this.#entities.get(id);
      return entity === undefined ? [] : [entity];
    }));
    return backend;
  }

  #ensureOpen(): void {
    if (this.#closed) throw new CommunityError("INDEX_STALE", "The SQLite search backend is closed");
  }
}

export async function createSqliteWasmSearchBackend(options: {
  readonly initialize: () => Promise<SqliteWasmSearchBackend>;
  readonly fallback: SearchBackend;
}): Promise<{
  readonly backend: SearchBackend;
  readonly mode: "sqlite-wasm" | "reference-fallback";
  readonly reason?: string;
}> {
  try {
    return Object.freeze({ backend: await options.initialize(), mode: "sqlite-wasm" });
  } catch (error) {
    return Object.freeze({
      backend: options.fallback,
      mode: "reference-fallback",
      reason: error instanceof Error ? error.message : "SQLite WASM initialization failed",
    });
  }
}

function abortError(): DOMException {
  return new DOMException("The SQLite search request was cancelled", "AbortError");
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw abortError();
}

const SQLITE_SCHEMA_V1 = Object.freeze([
  "CREATE TABLE IF NOT EXISTS entity (object_id TEXT PRIMARY KEY, kind TEXT NOT NULL, visibility TEXT NOT NULL, entity_json TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS entity_field (object_id TEXT NOT NULL REFERENCES entity(object_id) ON DELETE CASCADE, field_name TEXT NOT NULL, ordinal INTEGER NOT NULL, text_value TEXT, number_value REAL, boolean_value INTEGER, null_value INTEGER, PRIMARY KEY (object_id, field_name, ordinal))",
  "CREATE TABLE IF NOT EXISTS relation (source_id TEXT NOT NULL, relation_type TEXT NOT NULL, target_id TEXT NOT NULL, PRIMARY KEY (source_id, relation_type, target_id))",
  "CREATE VIRTUAL TABLE IF NOT EXISTS entity_fts USING fts5(object_id UNINDEXED, title, body, text, tokenize='unicode61 remove_diacritics 2')",
  "CREATE TABLE IF NOT EXISTS source_checkpoint (source_id TEXT PRIMARY KEY, token TEXT NOT NULL, observed_at TEXT NOT NULL, status TEXT NOT NULL, detail TEXT)",
  "CREATE TABLE IF NOT EXISTS projection_definition (projection_id TEXT NOT NULL, version INTEGER NOT NULL, definition_json TEXT NOT NULL, PRIMARY KEY (projection_id, version))",
  "CREATE TABLE IF NOT EXISTS namespace_mount (mount_id TEXT PRIMARY KEY, mount_json TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS query_history (history_id TEXT PRIMARY KEY, query_json TEXT NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS index_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS entity_field_lookup ON entity_field(field_name, text_value, number_value, boolean_value)",
  "CREATE INDEX IF NOT EXISTS relation_target_lookup ON relation(target_id, relation_type, source_id)",
]);
