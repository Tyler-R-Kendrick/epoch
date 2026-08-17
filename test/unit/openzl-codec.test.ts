import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  OPENZL_CODEC_ID,
  compressChangediff,
  compressChunkBytes,
  compressOpenZl,
  decodeObjectFromSync,
  decompressOpenZl,
  encodeObjectForSync,
  isOpenZlFrame,
  openZlHostCodec,
  preferOpenZlCompression,
  prepareForEntropy,
  profileForEntityType,
  registerOpenZlCodec,
} from "@epoch/openzl";

export function runOpenZlCodecTests(): void {
  jsonArtifactRoundTrips();
  semanticChangediffRoundTrips();
  chunkBytesRoundTrip();
  entityProfileMapping();
  preferOpenZlNegotiation();
  syncEncodeDecodePreservesPlaintext();
  registerOpenZlCodecOnRegistry();
  prepareForEntropyAndHostCodec();
}

function jsonArtifactRoundTrips(): void {
  const plain = Buffer.from(JSON.stringify({
    format: "epoch.artifact/v1",
    items: Array.from({ length: 20 }, (_, i) => ({ id: `row-${i}`, score: i })),
  }), "utf8");
  const digest = createHash("sha256").update(plain).digest("hex");
  const packed = compressOpenZl(plain, { entityType: "application/json" });
  assert.equal(packed.header.codecId, OPENZL_CODEC_ID);
  assert.equal(packed.header.profile, "json");
  assert.equal(packed.header.plaintextSha256, digest);
  assert.equal(isOpenZlFrame(packed.frame), true);
  assert.deepEqual(Buffer.from(decompressOpenZl(packed.frame)), plain);
}

function semanticChangediffRoundTrips(): void {
  const patch = {
    format: "epoch.semantic-patch/v1",
    level: "syntax",
    providerId: "json",
    edits: [{ kind: "update", path: "fn:main", before: "a", after: "b" }],
  };
  const packed = compressChangediff(JSON.stringify(patch));
  assert.equal(packed.header.profile, "semantic-patch");
  const out = JSON.parse(Buffer.from(decompressOpenZl(packed.frame)).toString("utf8"));
  assert.deepEqual(out, patch);
}

function chunkBytesRoundTrip(): void {
  const chunk = Buffer.alloc(1024, 0xab);
  chunk[0] = 1;
  const packed = compressChunkBytes(chunk, "application/octet-stream");
  assert.equal(packed.header.profile, "binary");
  assert.deepEqual(Buffer.from(decompressOpenZl(packed.frame)), chunk);
}

function entityProfileMapping(): void {
  assert.equal(profileForEntityType("application/json"), "json");
  assert.equal(profileForEntityType("text/markdown"), "markdown");
  assert.equal(profileForEntityType("text/plain"), "text");
  assert.equal(profileForEntityType("epoch.semantic-patch/v1"), "semantic-patch");
  assert.equal(profileForEntityType("image/png"), "binary");
  assert.equal(profileForEntityType("application/x-custom"), "generic");
}

function preferOpenZlNegotiation(): void {
  assert.equal(preferOpenZlCompression(["openzl", "identity"], ["identity", "openzl"]), "openzl");
  assert.equal(preferOpenZlCompression(["openzl", "identity"], ["identity"]), "identity");
  assert.equal(preferOpenZlCompression(["openzl"], ["identity"]), undefined);
}

function prepareForEntropyAndHostCodec(): void {
  const prepared = prepareForEntropy(Buffer.from(JSON.stringify({ a: 1, b: [2] })), "json");
  assert.ok(prepared.byteLength > 0);
  assert.deepEqual(
    Buffer.from(prepareForEntropy(Buffer.from("not-json"), "json")),
    Buffer.from("not-json"),
  );
  assert.deepEqual(
    Buffer.from(prepareForEntropy(Buffer.from("plain"), "text")),
    Buffer.from("plain"),
  );
  const packed = openZlHostCodec.compress(Buffer.from("host-codec"), "text/plain");
  assert.equal(isOpenZlFrame(packed), true);
  assert.deepEqual(Buffer.from(openZlHostCodec.decompress(packed)), Buffer.from("host-codec"));
  assert.equal(openZlHostCodec.id, OPENZL_CODEC_ID);
}

function syncEncodeDecodePreservesPlaintext(): void {
  const plain = Buffer.from("chunk-bytes-for-sync");
  const encoded = encodeObjectForSync(
    { objectId: "oid", kind: "chunk", bytes: plain, entityType: "application/octet-stream" },
    "openzl",
  );
  assert.notDeepEqual(Buffer.from(encoded.bytes), plain);
  const decoded = decodeObjectFromSync(encoded, "openzl");
  assert.deepEqual(Buffer.from(decoded.bytes), plain);
  assert.equal(encodeObjectForSync(encoded, "openzl").bytes, encoded.bytes);
  assert.deepEqual(
    Buffer.from(decodeObjectFromSync({ ...encoded, bytes: plain }, "openzl").bytes),
    plain,
  );
  assert.deepEqual(
    Buffer.from(encodeObjectForSync(
      { objectId: "oid", kind: "chunk", bytes: plain },
      "identity",
    ).bytes),
    plain,
  );
}

function registerOpenZlCodecOnRegistry(): void {
  const registered: string[] = [];
  registerOpenZlCodec({
    register(provider) {
      registered.push(`${provider.capability}:${provider.id}`);
      return provider;
    },
  });
  assert.ok(registered.includes("codec:epoch.openzl.host"));
  assert.ok(registered.includes("compression:epoch.openzl.compression"));
}
