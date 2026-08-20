/**
 * Node equivalent of VerifyTests/Verify: canonical JSON goldens under
 * `test/verify/verified/`, compared on every run. Refresh with
 * `EPOCH_UPDATE_VERIFIED=1`.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type JsonObject = { [key: string]: JsonValue };
type JsonValue = boolean | null | number | string | JsonObject | JsonValue[];

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

export function canonicalJson(value: JsonValue): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function assertVerified(name: string, value: JsonValue): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(name)) {
    throw new Error(`invalid verified name: ${name}`);
  }
  const verifiedDir = process.env.EPOCH_VERIFIED_DIR
    ? process.env.EPOCH_VERIFIED_DIR
    : path.join(process.cwd(), "test/verify/verified");
  mkdirSync(verifiedDir, { recursive: true });
  const verifiedPath = path.join(verifiedDir, `${name}.verified.json`);
  const receivedPath = path.join(verifiedDir, `${name}.received.json`);
  const actual = canonicalJson(value);
  const update = process.env.EPOCH_UPDATE_VERIFIED === "1";

  let expected: string | undefined;
  try {
    expected = readFileSync(verifiedPath, "utf8");
  } catch {
    expected = undefined;
  }

  if (update) {
    writeFileSync(verifiedPath, actual);
    return;
  }

  if (expected === undefined) {
    writeFileSync(receivedPath, actual);
    throw new Error(
      `missing golden ${path.relative(process.cwd(), verifiedPath)}. Inspect ${path.relative(process.cwd(), receivedPath)} then set EPOCH_UPDATE_VERIFIED=1.`,
    );
  }

  if (actual !== expected) {
    writeFileSync(receivedPath, actual);
    assert.equal(
      actual,
      expected,
      `characterization mismatch for ${name}. Review ${path.relative(process.cwd(), receivedPath)} then set EPOCH_UPDATE_VERIFIED=1 to accept.`,
    );
  }
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isJsonObject(value)) return value;
  const out: JsonObject = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalize(value[key]);
  }
  return out;
}
