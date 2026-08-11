/** Bundle the authoritative Community Core for the static Nightboard runtime. */
import { readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { resolve } from "node:path";
import { argv, cwd } from "node:process";

const check = argv.includes("--check");
const repository = resolve(argv.find((value) => !value.startsWith("--") && value !== argv[0] && value !== argv[1]) || cwd());
const source = resolve(repository, "packages/Epoch.Community.Core/src/index.ts");
const output = resolve(cwd(), "docs/design-explorations/nightboard/community-core-runtime.js");

const result = await build({
  entryPoints: [source],
  outfile: output,
  bundle: true,
  format: "iife",
  globalName: "NB_CORE",
  platform: "browser",
  target: ["es2020"],
  banner: { js: "/* Generated from packages/Epoch.Community.Core/src/index.ts. Run npm run nightboard:build. */\n/* global URLSearchParams */" },
  footer: { js: "window.NB_CORE = NB_CORE;" },
  write: false,
});

const generated = result.outputFiles[0].contents;
if (check) {
  if (!readFileSync(output).equals(generated)) {
    throw new Error("community-core-runtime.js is stale; run npm run nightboard:build");
  }
} else {
  writeFileSync(output, generated);
}
