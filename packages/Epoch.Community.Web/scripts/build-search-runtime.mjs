/** Build deterministic browser search Workers and copy the pinned SQLite WASM asset. */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { build } from "esbuild";
import { resolve } from "node:path";
import { argv, cwd } from "node:process";

const check = argv.includes("--check");
const repository = resolve(argv.find((value) => !value.startsWith("--") && value !== argv[0] && value !== argv[1]) || cwd());
const outputDirectory = resolve(repository, "packages/Epoch.Community.Web/app");
const targets = [
  ["packages/Epoch.Community.Web/src/search/orama-worker-entry.ts", "community-search-worker.js"],
  ["packages/Epoch.Community.Web/src/search/sqlite-worker-entry.ts", "community-sqlite-worker.js"],
];

for (const [source, filename] of targets) {
  const result = await build({
    absWorkingDir: repository,
    entryPoints: [resolve(repository, source)],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    banner: { js: `/* Generated from ${source}. Run npm run community-web:app:build. */` },
    write: false,
  });
  const text = Buffer.from(result.outputFiles[0].contents).toString("utf8").replace(/[ \t]+$/gmu, "");
  publish(resolve(outputDirectory, filename), Buffer.from(text));
}

const wasm = resolve(repository, "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm");
if (statSync(wasm).size === 0) throw new Error("The pinned SQLite WASM asset is missing");

function publish(path, bytes) {
  if (check) {
    if (!readFileSync(path).equals(bytes)) throw new Error(`${path} is stale; run npm run community-web:app:build`);
  } else writeFileSync(path, bytes);
}
