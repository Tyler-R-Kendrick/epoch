/**
 * Bundle the Community runtime for the browser app.
 *
 * The app loads plain scripts, so the runtime ships as one IIFE exposing
 * `window.CW_RUNTIME`. This is the same package the CLI and the SDK use — the
 * point of a shared command layer is defeated the moment the browser gets its
 * own copy of the logic, so it gets the real one.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { resolve } from "node:path";
import { argv, cwd } from "node:process";

const check = argv.includes("--check");
const repository = resolve(argv.find((value) => !value.startsWith("--") && value !== argv[0] && value !== argv[1]) || cwd());
const source = resolve(repository, "packages/Epoch.Community.Runtime/src/index.ts");
const output = resolve(repository, "packages/Epoch.Community.Web/app/community-runtime.js");

const result = await build({
  absWorkingDir: repository,
  entryPoints: [source],
  outfile: output,
  bundle: true,
  format: "iife",
  globalName: "CW_RUNTIME",
  platform: "browser",
  target: ["es2020"],
  banner: { js: "/* Generated from packages/Epoch.Community.Runtime/src/index.ts. Run npm run community-web:app:build. */" },
  footer: { js: "window.CW_RUNTIME = CW_RUNTIME;" },
  write: false,
});

const generated = result.outputFiles[0].text;
if (check) {
  const current = readFileSync(output, "utf8");
  if (current !== generated) {
    console.error("community-runtime.js is stale. Run npm run community-web:app:build.");
    process.exitCode = 1;
  }
} else {
  writeFileSync(output, generated);
  console.log(`community runtime: ${generated.length} bytes`);
}
