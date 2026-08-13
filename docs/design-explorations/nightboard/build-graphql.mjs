/** Build the portable @epoch/community-graphql browser runtime deterministically. */
import { readFileSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { build } from "esbuild";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv } from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const check = argv.includes("--check");
const repository = resolve(here, "../../..");
const entry = join(here, ".graphql-entry.mjs");
const output = join(here, "graphql-engine.js");
const source = [
  'import { createCommunityGraphQLSchema, executeCommunityGraphQL, subscribeCommunityGraphQL, COMMUNITY_GRAPHQL_SDL } from "@epoch/community-graphql";',
  'import { buildSchema, graphql, getIntrospectionQuery } from "graphql";',
  "window.CommunityGraphQL = { createCommunityGraphQLSchema, executeCommunityGraphQL, subscribeCommunityGraphQL, COMMUNITY_GRAPHQL_SDL };",
  "window.GraphQLEngine = { buildSchema, graphql, getIntrospectionQuery };",
].join("\n");

writeFileSync(entry, source);
try {
  const result = await build({
    absWorkingDir: repository,
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    legalComments: "none",
    write: false,
    banner: { js: "/* Generated from @epoch/community-graphql. Run npm run nightboard:build. */" },
  });
  const bytes = Buffer.from(result.outputFiles[0].contents);
  if (check) {
    if (!readFileSync(output).equals(bytes)) throw new Error(`${output} is stale; run npm run nightboard:build`);
  } else writeFileSync(output, bytes);
} finally {
  try { await import("node:fs/promises").then(({ unlink }) => unlink(entry)); } catch { /* cleanup after failed build */ }
}
