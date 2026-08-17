import assert from "node:assert/strict";
import {
  FASTCDC_V1,
  createChunkManifest,
  decodeChunkManifest,
  encodeChunkManifest,
  verifyChunkManifest,
} from "@epoch/core";
import {
  FileObjectStore,
  MemoryObjectStore,
  objectIdFor,
} from "@epoch/core";
import {
  createObjectPromise,
  fulfillObjectPromise,
  validateObjectPromise,
} from "@epoch/core";
import {
  SYNC_V2_PROTOCOL,
  applySyncV2Batch,
  planSyncV2,
} from "@epoch/core";
import {
  MemoryWorkspaceProvider,
  WorkspaceProviderRegistry,
  requireWorkspaceCapability,
} from "@epoch/core";
import {
  FileSystemWorkspaceProvider,
  browserWorkspaceCapabilities,
  createRiftLaunchSpec,
  createWorkspaceStateManifest,
} from "@epoch/core";
import {
  EMPTY_BLOB_SHA256,
  fetchVerifiedRange,
  verifyBlobAvailability,
} from "@epoch/core";
import {
  InProcessSyncV2Transport,
  SyncV2TransactionReceiver,
  createSyncV2Handshake,
  negotiateSyncV2,
} from "@epoch/core";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function runCoreStorageSyncV2Tests(): Promise<void> {
  await chunksAreDeterministicAndVerifiable();
  await storesAreImmutableAndHashChecked();
  await promisesVerifyBeforeMaterializing();
  await syncV2NegotiatesAndAppliesManifestFirst();
  await workspaceCapabilitiesAreHonestAndEnforced();
  await blobResidencyPromisesAndRangesAreExplicit();
  await syncHandshakeTransactionsAndTransportsAreBounded();
  await workspaceProviderModesStayTruthful();
}

async function chunksAreDeterministicAndVerifiable(): Promise<void> {
  assert.deepEqual(createChunkManifest(Buffer.from("0123456789abcdef".repeat(20_000)),
    "application/octet-stream").chunks, [
    { sha256: "cb8690e393200318a9f52ec1ea9c05cc48ea63eae57be5bb36ae4388f08270bb", offset: 0, length: 262_144 },
    { sha256: "1e1ea60aba88180e993ce484c1ce6be22af9e39e0bcb8a9bc26532223a8e0cf8", offset: 262_144, length: 57_856 },
  ], "FastCDC-v1 golden vector pins boundaries and hashes");
  const bytes = Buffer.from("abcd".repeat(40_000) + "changed" + "abcd".repeat(40_000));
  const first = createChunkManifest(bytes, "application/octet-stream");
  const second = createChunkManifest(bytes, "application/octet-stream");
  assert.deepEqual(first, second);
  assert.equal(first.protocol, "epoch.chunk-manifest/v1");
  assert.deepEqual(first.chunker, FASTCDC_V1);
  assert.ok(first.chunks.length > 1);
  assert.equal(first.chunks[0]?.offset, 0);
  assert.equal(first.chunks.at(-1)!.offset + first.chunks.at(-1)!.length, bytes.length);
  assert.deepEqual(decodeChunkManifest(encodeChunkManifest(first)), first);

  const chunks = new Map(first.chunks.map((chunk) => [
    chunk.sha256,
    bytes.subarray(chunk.offset, chunk.offset + chunk.length),
  ]));
  assert.deepEqual(await verifyChunkManifest(first, async (id) => chunks.get(id)), {
    ok: true,
    bytesVerified: bytes.length,
    chunksVerified: first.chunks.length,
  });
  chunks.set(first.chunks[0]!.sha256, Buffer.from("tampered"));
  const failed = await verifyChunkManifest(first, async (id) => chunks.get(id));
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.code, "chunk-hash-mismatch");
}

async function storesAreImmutableAndHashChecked(): Promise<void> {
  const memory = new MemoryObjectStore();
  const bytes = Buffer.from("immutable");
  const id = objectIdFor(bytes);
  await memory.put(id, bytes);
  await memory.put(id, bytes);
  await assert.rejects(memory.put(id, Buffer.from("different")), /hash|immutable/i);
  assert.deepEqual(await memory.get(id), bytes);

  const root = mkdtempSync(join(tmpdir(), "epoch-objects-"));
  try {
    const files = new FileObjectStore(root);
    await files.put(id, bytes);
    assert.equal(readFileSync(join(root, id.slice(0, 2), id.slice(2)), "utf8"), "immutable");
    await assert.rejects(files.put("0".repeat(64), bytes), /hash/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function promisesVerifyBeforeMaterializing(): Promise<void> {
  const bytes = Buffer.from("promised bytes");
  const promise = createObjectPromise({
    objectId: objectIdFor(bytes),
    size: bytes.length,
    sources: [{ kind: "https", url: "https://objects.example.test/promised" }],
  });
  assert.equal(validateObjectPromise(promise).ok, true);
  const store = new MemoryObjectStore();
  await fulfillObjectPromise(promise, store, async () => bytes);
  assert.deepEqual(await store.get(promise.objectId), bytes);
  await assert.rejects(
    fulfillObjectPromise(promise, new MemoryObjectStore(), async () => Buffer.from("wrong")),
    /hash|size/i,
  );
  assert.equal(validateObjectPromise({ ...promise, protocol: "future" }).ok, false);
}

async function syncV2NegotiatesAndAppliesManifestFirst(): Promise<void> {
  const bytes = Buffer.from("sync-v2".repeat(30_000));
  const manifest = createChunkManifest(bytes, "application/octet-stream");
  const manifestBytes = encodeChunkManifest(manifest);
  const manifestId = objectIdFor(manifestBytes);
  const local = { protocol: SYNC_V2_PROTOCOL, manifests: [], chunks: [] } as const;
  const remote = {
    protocol: SYNC_V2_PROTOCOL,
    manifests: [manifestId],
    chunks: manifest.chunks.map((chunk) => chunk.sha256),
  } as const;
  const plan = planSyncV2(local, remote);
  assert.deepEqual(plan.wantManifests, [manifestId]);
  assert.deepEqual(plan.wantChunks, remote.chunks.slice().sort());

  const store = new MemoryObjectStore();
  const objects = [
    ...manifest.chunks.map((chunk) => ({
      kind: "chunk" as const,
      objectId: chunk.sha256,
      bytes: bytes.subarray(chunk.offset, chunk.offset + chunk.length),
    })),
    { kind: "manifest" as const, objectId: manifestId, bytes: manifestBytes },
  ];
  const applied = await applySyncV2Batch(store, objects);
  assert.deepEqual(applied.applied[0], manifestId, "manifest is committed before its chunks");
  assert.equal(applied.applied.length, objects.length);
  await assert.rejects(applySyncV2Batch(new MemoryObjectStore(), [{
    kind: "chunk", objectId: "0".repeat(64), bytes: Buffer.from("bad"),
  }]), /hash/i);
}

async function workspaceCapabilitiesAreHonestAndEnforced(): Promise<void> {
  const provider = new MemoryWorkspaceProvider("memory", {
    watch: { status: "unsupported", reason: "in-memory workspaces do not emit filesystem events" },
  });
  const registry = new WorkspaceProviderRegistry();
  registry.register(provider);
  assert.equal(registry.get("memory"), provider);
  assert.equal(requireWorkspaceCapability(provider, "read").status, "supported");
  assert.throws(() => requireWorkspaceCapability(provider, "watch"), /unsupported.*filesystem events/i);
  await provider.write("src/a.txt", Buffer.from("a"));
  assert.equal((await provider.read("src/a.txt")).toString(), "a");
  await assert.rejects(provider.read("../escape"), /workspace path/i);
}

async function blobResidencyPromisesAndRangesAreExplicit(): Promise<void> {
  const empty = new MemoryObjectStore();
  assert.deepEqual(await verifyBlobAvailability({
    blobSha256: EMPTY_BLOB_SHA256, size: 0, entityType: "application/x.epoch.metadata",
  }, empty), { status: "resident", bytesVerified: 0 });

  const bytes = Buffer.from("range".repeat(40_000));
  const manifest = createChunkManifest(bytes, "application/octet-stream");
  const manifestBytes = encodeChunkManifest(manifest);
  const manifestId = objectIdFor(manifestBytes);
  const store = new MemoryObjectStore();
  await store.put(manifestId, manifestBytes);
  for (const chunk of manifest.chunks) {
    await store.put(chunk.sha256, bytes.subarray(chunk.offset, chunk.offset + chunk.length));
  }
  const reference = { blobSha256: manifest.blobSha256, size: bytes.length,
    entityType: manifest.entityType, storage: { kind: "chunk-manifest" as const, manifestSha256: manifestId } };
  assert.deepEqual(await verifyBlobAvailability(reference, store), { status: "resident", bytesVerified: bytes.length });
  const range = await fetchVerifiedRange(reference, store, 10, 100);
  assert.equal(range.status, "ok");
  if (range.status === "ok") assert.deepEqual(range.bytes, bytes.subarray(10, 100));
  const inlineId = objectIdFor(bytes);
  await store.put(inlineId, bytes);
  assert.equal((await fetchVerifiedRange({ blobSha256: inlineId, size: bytes.length,
    entityType: "application/octet-stream" }, store, 1, 2)).status, "requires-full-object");
  assert.equal((await fetchVerifiedRange({ blobSha256: inlineId, size: bytes.length,
    entityType: "application/octet-stream", storage: { kind: "external-pointer", locator: "opaque" } },
  store, 0, 1)).status, "rejected");
}

async function syncHandshakeTransactionsAndTransportsAreBounded(): Promise<void> {
  const local = createSyncV2Handshake();
  const remote = createSyncV2Handshake({ compressions: ["gzip", "identity"], eventVersions: [2, 1] });
  const negotiated = negotiateSyncV2(local, remote);
  assert.equal(negotiated.protocol, "epoch.sync/v2");
  assert.equal(negotiated.eventVersion, 1);
  assert.equal(negotiated.compression, "identity");
  const bothOpenZl = negotiateSyncV2(
    createSyncV2Handshake(),
    createSyncV2Handshake({ compressions: ["openzl", "identity"] }),
  );
  assert.equal(bothOpenZl.compression, "openzl");
  assert.ok(negotiated.commands.includes("push-transaction"));
  assert.throws(() => negotiateSyncV2(local, createSyncV2Handshake({ signatureAlgorithms: ["unsupported"] })),
    /capability intersection/i);
  const bytes = Buffer.from("transaction");
  const receiver = new SyncV2TransactionReceiver(new MemoryObjectStore());
  const transaction = { transactionId: "tx-1", expectedFrontier: ["head-1"],
    objects: [{ kind: "chunk" as const, objectId: objectIdFor(bytes), bytes }] };
  assert.equal((await receiver.push(transaction, ["head-1"])).outcome, "applied");
  assert.equal((await receiver.push(transaction, ["head-1"])).outcome, "replayed");
  assert.equal((await receiver.push({ ...transaction, transactionId: "tx-2" }, ["other"])).outcome, "conflict");
  const transport = new InProcessSyncV2Transport(async (command) => ({ command }));
  assert.deepEqual(await transport.request("capabilities", {}), { command: "capabilities" });
}

async function workspaceProviderModesStayTruthful(): Promise<void> {
  assert.throws(() => createRiftLaunchSpec({ enabled: false }), /explicit opt-in/i);
  assert.deepEqual(createRiftLaunchSpec({ enabled: true, arguments: ["--workspace", "safe"] }).sandbox,
    { isolated: false, mode: "in-process" });
  assert.equal(browserWorkspaceCapabilities({ opfs: false, indexedDb: false }).persistent.status, "unsupported");
  const root = mkdtempSync(join(tmpdir(), "epoch-workspace-"));
  try {
    const provider = new FileSystemWorkspaceProvider(root);
    await provider.write("nested/file.txt", Buffer.from("file"));
    assert.equal((await provider.read("nested/file.txt")).toString(), "file");
    assert.deepEqual(await provider.manifest(["nested/file.txt"]), [{ path: "nested/file.txt", size: 4, mode: 0o644 }]);
    await assert.rejects(provider.remove("."), /provider root/i);
    assert.equal(createWorkspaceStateManifest(provider, {
      residency: "resident", materialization: "materialized", execution: "disabled",
    }).storageMode, "filesystem");
  } finally { rmSync(root, { recursive: true, force: true }); }
}
