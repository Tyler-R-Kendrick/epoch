/**
 * Unit tests for the Verify-style golden helper itself.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertVerified, canonicalJson } from "../verify/assert-verified";

export function runVerifyHelperTests(): void {
  canonicalJsonSortsKeys();
  missingGoldenWritesReceived();
  mismatchWritesReceived();
  updateFlagAccepts();
}

function withVerifiedDir(run: (dir: string) => void): void {
  const dir = mkdtempSync(path.join(tmpdir(), "epoch-verify-"));
  const previous = process.env.EPOCH_VERIFIED_DIR;
  const previousUpdate = process.env.EPOCH_UPDATE_VERIFIED;
  process.env.EPOCH_VERIFIED_DIR = dir;
  try {
    run(dir);
  } finally {
    if (previous === undefined) delete process.env.EPOCH_VERIFIED_DIR;
    else process.env.EPOCH_VERIFIED_DIR = previous;
    if (previousUpdate === undefined) delete process.env.EPOCH_UPDATE_VERIFIED;
    else process.env.EPOCH_UPDATE_VERIFIED = previousUpdate;
    rmSync(dir, { recursive: true, force: true });
  }
}

function canonicalJsonSortsKeys(): void {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{\n  "a": 2,\n  "b": 1\n}\n');
}

function missingGoldenWritesReceived(): void {
  withVerifiedDir((dir) => {
    delete process.env.EPOCH_UPDATE_VERIFIED;
    assert.throws(() => assertVerified("fresh-name", { ok: true }), /missing golden/);
    const received = readFileSync(path.join(dir, "fresh-name.received.json"), "utf8");
    assert.equal(received, canonicalJson({ ok: true }));
  });
}

function mismatchWritesReceived(): void {
  withVerifiedDir((dir) => {
    writeFileSync(path.join(dir, "stale.verified.json"), canonicalJson({ n: 1 }));
    assert.throws(() => assertVerified("stale", { n: 2 }), /characterization mismatch/);
    const received = readFileSync(path.join(dir, "stale.received.json"), "utf8");
    assert.equal(received, canonicalJson({ n: 2 }));
  });
}

function updateFlagAccepts(): void {
  withVerifiedDir((dir) => {
    process.env.EPOCH_UPDATE_VERIFIED = "1";
    assertVerified("accepted", { n: 3 });
    assert.equal(readFileSync(path.join(dir, "accepted.verified.json"), "utf8"), canonicalJson({ n: 3 }));
  });
}
