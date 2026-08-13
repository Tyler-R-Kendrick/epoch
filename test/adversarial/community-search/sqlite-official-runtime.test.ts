import assert from "node:assert/strict";
import {
  initializeSqliteIndex,
  translateSearchExpressionToSql,
  type SqliteStatementDatabase,
} from "../../../packages/Epoch.Community.Web/src/search/sqlite-wasm-backend";
import { createSqliteStatementDatabase, type SqliteRawDatabase } from "../../../packages/Epoch.Community.Web/src/search/sqlite-worker";

export async function runOfficialSqliteRuntimeAdversarialTests(): Promise<void> {
  const { default: initializeSqlite } = await import("@sqlite.org/sqlite-wasm");
  const sqlite = await initializeSqlite();
  const raw = new sqlite.oo1.DB(":memory:", "ct");
  const database: SqliteStatementDatabase = createSqliteStatementDatabase(raw as unknown as SqliteRawDatabase);

  try {
    const health = await initializeSqliteIndex(database, { storageMode: "memory" });
    assert.equal(sqlite.version.libVersion, "3.53.0");
    assert.equal(health.fts5, true);
    database.execute("INSERT INTO entity(object_id, kind, visibility, entity_json, updated_at) VALUES (?, ?, ?, ?, ?)", [
      "issue-safe", "issue", "public", "{}", "2026-08-12T20:00:00.000Z",
    ]);
    database.execute("INSERT INTO entity_fts(object_id, title, body, text) VALUES (?, ?, ?, ?)", [
      "issue-safe", "Projection parser", "deterministic search", "Projection parser deterministic search",
    ]);

    const hostile = `projection" OR secret:*`;
    const translated = translateSearchExpressionToSql(
      { kind: "text", fields: ["title"], value: hostile, mode: "phrase" }, ["issue-safe"],
    );
    assert.doesNotMatch(translated.sql, /secret|projection/u);
    assert.ok(translated.parameters.includes(`"projection"" OR secret:*"`));
    assert.deepEqual(database.rows(translated.sql, translated.parameters), []);

    const safe = translateSearchExpressionToSql(
      { kind: "text", fields: ["title"], value: "projection", mode: "term" }, ["issue-safe"],
    );
    assert.deepEqual(database.rows(safe.sql, safe.parameters).map((row) => row.object_id), ["issue-safe"]);
    assert.equal(database.value("SELECT count(*) FROM entity"), 1, "hostile FTS input must not mutate schema or rows");
  } finally {
    database.close();
  }
}

if (require.main === module) {
  runOfficialSqliteRuntimeAdversarialTests().then(
    () => console.log("official SQLite runtime adversarial tests passed"),
    (error: unknown) => { console.error(error); process.exitCode = 1; },
  );
}
