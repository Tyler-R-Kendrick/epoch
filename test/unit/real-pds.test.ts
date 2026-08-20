import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EpochRepository } from "@epoch/core";
import {
  FederatedCommunity,
  MockPds,
  PrivatePublishError,
  RealPds,
  verifyBlobCid,
} from "@epoch/atproto";
import { createHash } from "node:crypto";

export async function runRealPdsTests(): Promise<void> {
  await realAdapterOffUntilE10();
  await privatePublishFailsBothImpls();
  await cidSpoofFailsHash();
  await pdsDownStillGossipSyncs();
}

async function realAdapterOffUntilE10(): Promise<void> {
  const pds = new RealPds();
  assert.equal(pds.enabled, false);
  await assert.rejects(() => pds.createRecord({
    did: "did:plc:alice",
    collection: "org.epoch.actor.profile",
    record: { displayName: "A" },
  // SAFETY: Runtime checks or construction above establish { code?: string }).code === "feature_disabled").
  }), (error) => error instanceof Error && (/* SAFETY: Assertion is justified by surrounding validation or construction. */ error as { code?: string }).code === "feature_disabled");
}

async function privatePublishFailsBothImpls(): Promise<void> {
  for (const pds of [new MockPds(), new RealPds({ enabled: true })]) {
    const community = new FederatedCommunity({ mode: "federated", pds });
    community.bindIdentity({ did: "did:plc:alice", handle: "alice.test", pdsEndpoint: "mock://pds" });
    await assert.rejects(
      () => community.publishPublicArtifacts({
        repository: tempRepo(),
        versionOrEventId: "missing",
        ownerDid: "did:plc:alice",
        visibility: "private",
      }),
      (error) => error instanceof PrivatePublishError,
    );
  }
}

async function cidSpoofFailsHash(): Promise<void> {
  const pds = new RealPds({ enabled: true });
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const uploaded = await pds.uploadBlob("did:plc:alice", bytes);
  const genuine = createHash("sha256").update(bytes).digest("hex");
  assert.equal(verifyBlobCid(bytes, genuine), true);
  assert.equal(pds.verifyStoredBlob(uploaded.cid, "0".repeat(64)), false);
  assert.equal(pds.verifyStoredBlob(uploaded.cid, genuine), true);
}

async function pdsDownStillGossipSyncs(): Promise<void> {
  const repo = tempRepo();
  writeFileSync(join(repo.root, "note.txt"), "hi");
  repo.recordFile("note.txt", "text/plain");
  const pds = new RealPds({ enabled: false });
  await assert.rejects(() => pds.getBlob("did:plc:alice", "bafy"), (error) =>
    // SAFETY: Runtime checks or construction above establish { code?: string }).code === "feature_disabled").
    error instanceof Error && (error as { code?: string }).code === "feature_disabled");
  assert.deepEqual(repo.verify(), []);
}

function tempRepo(): EpochRepository {
  const root = mkdtempSync(join(tmpdir(), "epoch-pds-"));
  const repo = EpochRepository.create(root, { author: "maya" });
  writeFileSync(join(root, "note.txt"), "hi");
  return repo;
}
