/** Bundle the authoritative Community Core for the static Community Web runtime. */
import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { resolve } from "node:path";
import { argv, cwd } from "node:process";

const check = argv.includes("--check");
const repository = resolve(argv.find((value) => !value.startsWith("--") && value !== argv[0] && value !== argv[1]) || cwd());
const source = resolve(repository, "packages/Epoch.Community.Core/src/index.ts");
const output = resolve(repository, "packages/Epoch.Community.Web/app/community-core-runtime.js");

const result = await build({
  absWorkingDir: repository,
  entryPoints: [source],
  outfile: output,
  bundle: true,
  format: "iife",
  globalName: "CW_CORE",
  platform: "browser",
  target: ["es2020"],
  banner: { js: "/* Generated from packages/Epoch.Community.Core/src/index.ts. Run npm run community-web:app:build. */\n/* global URLSearchParams */" },
  footer: { js: "window.CW_CORE = CW_CORE;" },
  write: false,
});

const generated = result.outputFiles[0].contents;
if (check) {
  if (!readFileSync(output).equals(generated)) {
    throw new Error("community-core-runtime.js is stale; run npm run community-web:app:build");
  }
} else {
  writeFileSync(output, generated);
}
