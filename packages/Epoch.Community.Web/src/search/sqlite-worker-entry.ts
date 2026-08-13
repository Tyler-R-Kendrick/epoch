import { startSqliteWorker, type SqliteWorkerScope } from "./sqlite-worker";
import type { SqliteStorageMode } from "./persistence-coordinator";

const mode = new URL(self.location.href).searchParams.get("mode") ?? "memory";
const allowed = new Set<SqliteStorageMode>(["memory", "opfs", "opfs-wl", "opfs-sahpool"]);

if (!allowed.has(mode as SqliteStorageMode)) throw new Error("Unsupported Epoch SQLite Worker storage mode");
void startSqliteWorker(self as unknown as SqliteWorkerScope, { storageMode: mode as SqliteStorageMode });
