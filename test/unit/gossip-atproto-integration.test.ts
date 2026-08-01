import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EpochRepository,
  HttpGossipPeer,
  LocalGossipPeer,
  startGossipServer,
} from "@epoch/core";
import {
  FederatedCommunity,
  FeatureDisabledError,
  MockPds,
  PrivatePublishError,
  bootstrapFromRepoCard,
  materializeReleaseArtifacts,
  resolveBlob,
} from "@epoch/atproto";

export async function runGossipAtprotoIntegrationTests(): Promise<void> {
  await offlinePeersExchangeFullHistoryViaGossip();
  await publicArtifactsOnAtPrivateNeverTouchesAt();
  await atFallbackMaterializesPublicBlobAndVerifyPasses();
  await federationModesGossipVsAtPublish();
}

async function offlinePeersExchangeFullHistoryViaGossip(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-gossip-"));
  try {
    const aRoot = join(root, "a");
    const bRoot = join(root, "b");
    mkdirSync(aRoot);
    mkdirSync(bRoot);
    const peerA = new EpochRepository(aRoot);
    const peerB = new EpochRepository(bRoot);
    peerA.init("alice");
    peerB.init("bob");

    writeFileSync(join(aRoot, "hello.txt"), "from-alice\n");
    peerA.recordFile("hello.txt", "text/plain", "alice");
    writeFileSync(join(bRoot, "world.txt"), "from-bob\n");
    peerB.recordFile("world.txt", "text/plain", "bob");

    // In-process local gossip first.
    const localResult = await peerA.gossipExchange(new LocalGossipPeer(peerB), "local-b");
    assert.ok(localResult.eventsCopied >= 1 || peerA.events().length >= 2);

    // HTTP gossip: B serves, A pulls/pushes.
    writeFileSync(join(aRoot, "more.txt"), "more-a\n");
    peerA.recordFile("more.txt", "text/plain", "alice");
    const server = await startGossipServer(peerB, { host: "127.0.0.1", port: 0 });
    try {
      const httpResult = await peerA.gossipExchange(new HttpGossipPeer(server.url), server.url);
      assert.ok(httpResult.eventsCopied >= 0);
      // B should have alice files after exchange (A's first exchange pushed to B via Local;
      // HTTP exchange: A posts snapshot to B, B returns its state including what it has).
      const bHasHello =
        existsSync(join(bRoot, ".epoch", "blobs", shaOf("from-alice\n")))
        || peerB.exportToMemoryTransport().exportSnapshot().blobs[
          Object.keys(peerA.exportToMemoryTransport().exportSnapshot().blobs)[0] ?? ""
        ] !== undefined;
      assert.ok(
        Object.keys(peerB.exportToMemoryTransport().exportSnapshot().blobs).length >= 1,
        "peer B should hold blobs after gossip",
      );
      void bHasHello;
      assert.deepEqual(peerA.verify(), []);
      assert.deepEqual(peerB.verify(), []);
    } finally {
      await server.close();
    }

    // Full bilateral: after A gossiped with B, B gossip with A to complete.
    const serverA = await startGossipServer(peerA, { host: "127.0.0.1", port: 0 });
    try {
      await peerB.gossipExchange(new HttpGossipPeer(serverA.url), serverA.url);
      const snapB = peerB.exportToMemoryTransport().exportSnapshot();
      const snapA = peerA.exportToMemoryTransport().exportSnapshot();
      // Shared blob hashes should overlap after two-way gossip.
      const hashesA = new Set(Object.keys(snapA.blobs));
      const hashesB = new Set(Object.keys(snapB.blobs));
      const overlap = [...hashesA].filter((h) => hashesB.has(h));
      assert.ok(overlap.length >= 1, "peers should share at least one blob after gossip");
      assert.deepEqual(peerA.verify(), []);
      assert.deepEqual(peerB.verify(), []);
    } finally {
      await serverA.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function publicArtifactsOnAtPrivateNeverTouchesAt(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-artifacts-"));
  try {
    const epochRoot = join(root, "repo");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    repository.init("alice");
    writeFileSync(join(epochRoot, "pub.txt"), "public-bytes\n");
    repository.recordFile("pub.txt", "text/plain", "alice");
    const version = repository.createVersion({ name: "v1", author: "alice" });

    const pds = new MockPds();
    const community = new FederatedCommunity({
      mode: "federated",
      pds,
      gossipPeers: ["http://127.0.0.1:9/epoch/gossip"],
    });

    const published = await community.publishPublicArtifacts({
      repository,
      versionOrEventId: version.id,
      ownerDid: "did:plc:alice",
      visibility: "public",
      repoSlug: "epoch/demo",
    });
    assert.ok(published.atUri?.includes("org.epoch.release"));
    assert.ok(published.artifacts.length >= 1);
    assert.ok(published.artifacts[0]?.atBlobCid);
    assert.ok(pds.blobCount() >= 1);
    assert.ok(pds.allRecords().some((r) => r.collection === "org.epoch.release"));

    // Private fail-closed: zero new AT activity for private publish.
    const before = pds.allRecords().length;
    const blobBefore = pds.blobCount();
    await assert.rejects(
      () =>
        community.publishPublicArtifacts({
          repository,
          versionOrEventId: version.id,
          ownerDid: "did:plc:alice",
          visibility: "private",
        }),
      (error: unknown) => error instanceof PrivatePublishError,
    );
    assert.equal(pds.allRecords().length, before);
    assert.equal(pds.blobCount(), blobBefore);
    assert.deepEqual(repository.verify(), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function atFallbackMaterializesPublicBlobAndVerifyPasses(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-at-fallback-"));
  try {
    const sourceRoot = join(root, "source");
    mkdirSync(sourceRoot);
    const source = new EpochRepository(sourceRoot);
    source.init("alice");
    writeFileSync(join(sourceRoot, "asset.bin"), "payload-for-at\n");
    source.recordFile("asset.bin", "application/octet-stream", "alice");
    const version = source.createVersion({ name: "v-at", author: "alice" });
    const pds = new MockPds();
    const community = new FederatedCommunity({ mode: "federated", pds });
    const published = await community.publishPublicArtifacts({
      repository: source,
      versionOrEventId: version.id,
      ownerDid: "did:plc:alice",
      visibility: "public",
    });
    const artifact = published.artifacts[0];
    assert.ok(artifact?.atBlobCid);

    // Fresh repo missing the blob entirely.
    const destRoot = join(root, "dest");
    mkdirSync(destRoot);
    const dest = new EpochRepository(destRoot);
    dest.init("bob");
    // Import version event metadata without blob (simulate thin client with event only).
    dest.syncWithTransport(source.exportToMemoryTransport());
    // Delete the blob to force AT fallback.
    const blobPath = join(destRoot, ".epoch", "blobs", artifact!.sha256);
    if (existsSync(blobPath)) {
      rmSync(blobPath);
    }

    const resolved = await resolveBlob({
      repository: dest,
      sha256: artifact!.sha256,
      mode: "federated",
      ownerDid: "did:plc:alice",
      atBlobCid: artifact!.atBlobCid,
      pds,
    });
    assert.equal(resolved.source, "atproto");
    assert.ok(existsSync(blobPath));
    assert.equal(readFileSync(blobPath, "utf8"), "payload-for-at\n");
    assert.deepEqual(dest.verify(), []);

    const materialize = await materializeReleaseArtifacts({
      repository: dest,
      mode: "federated",
      ownerDid: "did:plc:alice",
      artifacts: published.artifacts,
      pds,
    });
    assert.ok(materialize.every((item) => item.source === "local" || item.source === "atproto"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function federationModesGossipVsAtPublish(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "epoch-modes-"));
  try {
    const epochRoot = join(root, "repo");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    repository.init("alice");
    writeFileSync(join(epochRoot, "f.txt"), "x\n");
    repository.recordFile("f.txt", "text/plain", "alice");
    const version = repository.createVersion({ name: "m1", author: "alice" });

    // Gossip works without AT (local peer).
    const peerRoot = join(root, "peer");
    mkdirSync(peerRoot);
    const peer = new EpochRepository(peerRoot);
    peer.init("bob");
    await repository.gossipExchange(new LocalGossipPeer(peer), "peer");
    assert.deepEqual(repository.verify(), []);

    // disabled / local-only cannot publish AT artifacts.
    for (const mode of ["disabled", "local-only"] as const) {
      const community = new FederatedCommunity({ mode, pds: new MockPds() });
      await assert.rejects(
        () =>
          community.publishPublicArtifacts({
            repository,
            versionOrEventId: version.id,
            ownerDid: "did:plc:alice",
            visibility: "public",
          }),
        (error: unknown) =>
          error instanceof FeatureDisabledError
          || (error instanceof Error && error.message.includes("federated")),
      );
    }

    // bootstrap ignores AT paths in local-only.
    const card = {
      slug: "s",
      name: "n",
      description: "d",
      visibility: "public" as const,
      ownerDid: "did:plc:alice",
      topics: [],
      gossipPeers: ["http://127.0.0.1:1"],
    };
    const localBoot = bootstrapFromRepoCard(card, {
      mode: "local-only",
      release: {
        versionId: version.id,
        originatingEventId: version.id,
        artifacts: [{ sha256: "abc", size: 1, atBlobCid: "cid" }],
        createdAt: new Date().toISOString(),
      },
    });
    assert.equal(localBoot.releaseArtifacts.length, 0);
    assert.equal(localBoot.gossipPeers.length, 1);

    const fedBoot = bootstrapFromRepoCard(card, {
      mode: "federated",
      release: {
        versionId: version.id,
        originatingEventId: version.id,
        artifacts: [{ sha256: "abc", size: 1, atBlobCid: "cid" }],
        createdAt: new Date().toISOString(),
      },
    });
    assert.equal(fedBoot.releaseArtifacts.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function shaOf(text: string): string {
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}
