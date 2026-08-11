/** Bundle the authoritative Community Core for the static Nightboard runtime. */
import { build } from "esbuild";
import { resolve } from "node:path";
import { argv, cwd } from "node:process";

const repository = resolve(argv[2] || cwd());
const source = resolve(repository, "packages/Epoch.Community.Core/src/index.ts");
const output = resolve(cwd(), "docs/design-explorations/nightboard/community-core-runtime.js");

await build({
  entryPoints: [source],
  outfile: output,
  bundle: true,
  format: "iife",
  globalName: "NB_CORE",
  platform: "browser",
  target: ["es2020"],
  banner: { js: "/* Generated from packages/Epoch.Community.Core/src/index.ts. Run npm run nightboard:build. */\n/* global URLSearchParams */" },
  footer: { js: "window.NB_CORE = NB_CORE;" },
});
