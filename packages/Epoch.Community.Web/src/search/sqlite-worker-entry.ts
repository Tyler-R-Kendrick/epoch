import { startSqliteWorker, type SqliteWorkerScope } from "./sqlite-worker";
import type { SqliteStorageMode } from "./persistence-coordinator";

const requestedMode = new URL(self.location.href).searchParams.get("mode") ?? "memory";
const allowed = new Set<SqliteStorageMode>(["memory", "opfs", "opfs-wl", "opfs-sahpool"]);

const mode = [...allowed].find((candidate) => candidate === requestedMode);
if (mode === undefined) throw new Error("Unsupported Epoch SQLite Worker storage mode");
// SAFETY: This module is loaded only as a dedicated worker entry; its global
// message and postMessage surface is the SqliteWorkerScope boundary.
void startSqliteWorker(self as SqliteWorkerScope, { storageMode: mode });
