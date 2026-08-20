import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { setTimeout } from "node:timers";
import { URL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "../../..");
const WORKER = resolve(ROOT, "docs/design-explorations/nightboard/community-sqlite-worker.js");
const WASM = resolve(ROOT, "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm");

const harness = await build({
  absWorkingDir: ROOT,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  write: false,
  stdin: {
    resolveDir: ROOT,
    sourcefile: "sqlite-browser-harness.ts",
    contents: `
      import {
        chooseSqliteStorage,
        detectSqliteStorageCapabilities,
      } from "./packages/Epoch.Community.Web/src/search/persistence-coordinator";

      const noOpfs = detectSqliteStorageCapabilities({
        navigator: { storage: {} },
        crossOriginIsolated: false,
        SharedArrayBuffer: undefined,
      });
      const selection = chooseSqliteStorage(noOpfs);
      const worker = new Worker("/community-sqlite-worker.js?mode=" + selection.mode, {
        type: "module",
        name: "epoch-community-sqlite-browser-test",
      });
      let sequence = 0;
      const pending = new Map();
      worker.onmessage = ({ data }) => {
        const request = pending.get(data.requestId);
        if (!request) return;
        pending.delete(data.requestId);
        data.ok ? request.resolve(data.value) : request.reject(Object.assign(new Error(data.error?.message), data.error));
      };
      worker.onerror = (event) => {
        for (const request of pending.values()) request.reject(new Error(event.message || "SQLite Worker failed"));
        pending.clear();
      };
      const request = (operation) => new Promise((resolve, reject) => {
        const requestId = ++sequence;
        pending.set(requestId, { resolve, reject });
        worker.postMessage({ requestId, operation });
      });
      const entity = {
        ref: { objectId: "browser-issue", kind: "issue" },
        fields: { title: "Projection engine", state: "open" },
        searchableText: { title: "Projection engine", body: "Deterministic browser search" },
        relations: [],
        visibility: "public",
        participantIds: [],
        createdAt: "2026-08-12T00:00:00.000Z",
        updatedAt: "2026-08-12T00:00:00.000Z",
        provenance: { sourceId: "browser-test", nativeId: "browser-issue", observedAt: "2026-08-12T00:00:00.000Z" },
      };

      globalThis.__sqliteBrowserResult = (async () => {
        try {
          const health = await request({ type: "health" });
          await request({ type: "replace", entities: [entity] });
          const hits = await request({
            type: "query",
            expression: { kind: "text", fields: ["title"], value: "projection", mode: "term" },
            allowedObjectIds: [entity.ref.objectId],
          });
          const unauthorized = await request({
            type: "query",
            expression: { kind: "all" },
            allowedObjectIds: [],
          });
          await request({ type: "close" });
          return { health, hits, unauthorized, noOpfs, selection };
        } finally {
          worker.terminate();
        }
      })();
    `,
  },
});

const assets = new Map([
  ["/community-sqlite-worker.js", { type: "text/javascript; charset=utf-8", body: await readFile(WORKER) }],
  ["/sqlite3.wasm", { type: "application/wasm", body: await readFile(WASM) }],
  ["/harness.js", { type: "text/javascript; charset=utf-8", body: harness.outputFiles[0].contents }],
  ["/", { type: "text/html; charset=utf-8", body: Buffer.from('<script type="module" src="/harness.js"></script>') }],
]);

const launchOptions = {
  headless: true,
  args: ["--no-sandbox"],
};
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}
const browser = await chromium.launch(launchOptions);
try {
  const context = await browser.newContext();
  await context.route("https://epoch.test/**", async (route) => {
    const asset = assets.get(new URL(route.request().url()).pathname);
    if (asset === undefined) { await route.fulfill({ status: 404 }); return; }
    await route.fulfill({ status: 200, contentType: asset.type, body: asset.body });
  });
  const page = await context.newPage();
  await page.goto("https://epoch.test/");
  const result = await page.evaluate(async () => await Promise.race([
    globalThis.__sqliteBrowserResult,
    new Promise((_, reject) => setTimeout(() => reject(new Error("SQLite Worker timed out")), 20_000)),
  ]));
  assert.deepEqual(result.noOpfs, { opfs: false, crossOriginIsolated: false, sharedArrayBuffer: false });
  assert.deepEqual(result.selection, { mode: "memory", persistent: false, reason: "OPFS is unavailable" });
  assert.equal(result.health.fts5, true);
  assert.equal(result.health.storageMode, "memory");
  assert.deepEqual(result.hits, ["browser-issue"]);
  assert.deepEqual(result.unauthorized, []);
  await page.close();
  await context.close();
  console.log("Chromium SQLite Worker/WASM FTS5 and no-OPFS fallback passed");
} finally {
  await browser.close();
}
