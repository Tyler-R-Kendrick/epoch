import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schemaPath = resolve(root, "schemas/events-v1.schema.json");
const require = createRequire(import.meta.url);
const { protocolJsonSchemas } = require(resolve(root, "dist/schema.js"));
const generated = `${JSON.stringify(protocolJsonSchemas(), null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(schemaPath, "utf8") !== generated) {
    throw new Error("Protocol JSON Schema is stale; run npm run build -w @epoch/protocol then npm run schemas:generate -w @epoch/protocol");
  }
} else {
  writeFileSync(schemaPath, generated, "utf8");
}
