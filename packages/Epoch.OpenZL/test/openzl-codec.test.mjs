import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  OPENZL_CODEC_ID,
  compressChangediff,
  compressChunkBytes,
  compressOpenZl,
  decompressOpenZl,
  isOpenZlFrame,
  preferOpenZlCompression,
  profileForEntityType,
} from "../dist/index.js";

test("openzl: json artifact round-trips with plaintext digest", () => {
  const plain = Buffer.from(JSON.stringify({
    format: "epoch.artifact/v1",
    items: Array.from({ length: 40 }, (_, i) => ({ id: `row-${i}`, score: i * 3, tag: "repeat" })),
  }), "utf8");
  const digest = createHash("sha256").update(plain).digest("hex");
  const packed = compressOpenZl(plain, { entityType: "application/json" });
  assert.equal(packed.header.codecId, OPENZL_CODEC_ID);
  assert.equal(packed.header.profile, "json");
  assert.equal(packed.header.plaintextSha256, digest);
  assert.equal(isOpenZlFrame(packed.frame), true);
  const out = decompressOpenZl(packed.frame);
  assert.deepEqual(Buffer.from(out), plain);
});

test("openzl: semantic changediff round-trips", () => {
  const patch = {
    format: "epoch.semantic-patch/v1",
    level: "syntax",
    providerId: "json",
    language: "json",
    edits: [
      { kind: "update", path: "fn:main", before: "a", after: "b" },
      { kind: "insert", path: "fn:helper", after: "c" },
    ],
  };
  const packed = compressChangediff(JSON.stringify(patch));
  assert.equal(packed.header.profile, "semantic-patch");
  const out = JSON.parse(Buffer.from(decompressOpenZl(packed.frame)).toString("utf8"));
  assert.deepEqual(out, patch);
});

test("openzl: CDC chunk bytes round-trip under binary profile", () => {
  const chunk = Buffer.alloc(4096, 0xab);
  chunk[0] = 1;
  chunk[100] = 2;
  const packed = compressChunkBytes(chunk, "application/octet-stream");
  assert.equal(packed.header.profile, "binary");
  assert.deepEqual(Buffer.from(decompressOpenZl(packed.frame)), chunk);
});

test("openzl: entity profile mapping", () => {
  assert.equal(profileForEntityType("application/json"), "json");
  assert.equal(profileForEntityType("text/markdown"), "markdown");
  assert.equal(profileForEntityType("text/plain"), "text");
  assert.equal(profileForEntityType("epoch.semantic-patch/v1"), "semantic-patch");
});

test("openzl: prefer openzl in sync negotiation order", () => {
  assert.equal(
    preferOpenZlCompression(["openzl", "identity"], ["identity", "openzl"]),
    "openzl",
  );
  assert.equal(
    preferOpenZlCompression(["openzl", "identity"], ["identity"]),
    "identity",
  );
});

test("openzl: sync object encode/decode preserves plaintext", async () => {
  const { encodeObjectForSync, decodeObjectFromSync, decompressOpenZl } = await import("../dist/index.js");
  const plain = Buffer.from("chunk-bytes-for-sync");
  const encoded = encodeObjectForSync(
    { objectId: "oid", kind: "chunk", bytes: plain, entityType: "application/octet-stream" },
    "openzl",
  );
  assert.notDeepEqual(Buffer.from(encoded.bytes), plain);
  const decoded = decodeObjectFromSync(encoded, "openzl");
  assert.deepEqual(Buffer.from(decoded.bytes), plain);
  assert.deepEqual(Buffer.from(decompressOpenZl(encoded.bytes)), plain);
});
