/**
 * Bundle the real GraphQL engine for the page.
 *
 * graphql-js rather than a hand-rolled resolver: 177KB minified buys schema
 * validation, proper error positions, and introspection. Introspection is the
 * part that matters here — the agent asks the schema what exists instead of
 * being told in a prompt that can drift from the data.
 *
 *   node docs/design-explorations/nightboard/build-graphql.mjs
 */
import { writeFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, ".graphql-entry.mjs");

writeFileSync(
  entry,
  [
    'import { buildSchema, graphql, getIntrospectionQuery } from "graphql";',
    "window.GraphQLEngine = { buildSchema, graphql, getIntrospectionQuery };",
  ].join("\n"),
);

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: join(here, "graphql-engine.js"),
  minify: true,
  legalComments: "none",
  logLevel: "error",
});

rmSync(entry);
console.log("graphql engine:", statSync(join(here, "graphql-engine.js")).size, "bytes");
