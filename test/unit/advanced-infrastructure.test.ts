import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BundleEpochTransport,
  EntityRegistry,
  EpochRepository,
  createToonSerializationProvider,
} from "@epoch/core";

export function runAdvancedInfrastructureTests(): void {
  bundleTransportRoundTripsThroughSignedPacket();
  reusableResolutionFeedsEntityMerge();
  redactionPlanListsAffectedEventsAndBlobs();
  entityRegistryExposesAdapterCapabilities();
  customSerializationProviderRoundTripsEvents();
}

function bundleTransportRoundTripsThroughSignedPacket(): void {
  const sourceRoot = mkdtempSync(join(tmpdir(), "epoch-bundle-source-"));
  const targetRoot = mkdtempSync(join(tmpdir(), "epoch-bundle-target-"));
  const bundlePath = join(tmpdir(), `epoch-sync-${Date.now()}.bundle`);
  const source = new EpochRepository(sourceRoot);
  const target = new EpochRepository(targetRoot);
  source.init("alice");
  target.init("bob");
  writeFileSync(join(sourceRoot, "note.txt"), "hello\n", "utf8");
  source.recordFile("note.txt", "text/plain");

  BundleEpochTransport.write(bundlePath, source.exportToMemoryTransport());
  const result = target.syncWithTransport(BundleEpochTransport.read(bundlePath));

  assert.equal(result.eventsCopied, 1);
  assert.deepEqual(target.verify(), []);
  // SAFETY: Runtime checks or construction above establish string).
  assert.equal(readFileSync(join(target.blobsDir, source.events()[0].payload.blob_sha256 as string), "utf8"), "hello\n");
}

function reusableResolutionFeedsEntityMerge(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-resolution-"));
  const repository = new EpochRepository(root);
  repository.init("alice");
  repository.recordConflictResolution({
    path: "config.json",
    entityType: "application/json",
    base: { flag: 0 },
    left: { flag: 1 },
    right: { flag: 2 },
    resolved: { flag: 3 },
  });

  const merged = repository.mergeEntity("config.json", "application/json", { flag: 0 }, { flag: 1 }, { flag: 2 });

  assert.deepEqual(merged, { flag: 3 });
}

function redactionPlanListsAffectedEventsAndBlobs(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-redact-plan-"));
  const repository = new EpochRepository(root);
  repository.init("alice");
  writeFileSync(join(root, "secret.txt"), "token\n", "utf8");
  const event = repository.recordFile("secret.txt", "text/plain");
  // SAFETY: Runtime checks or construction above establish string.
  const blob = event.payload.blob_sha256 as string;

  const plan = repository.planRedaction(blob);

  assert.equal(plan.blobSha256, blob);
  assert.deepEqual(plan.eventIds, [event.id]);
  assert.equal(plan.localBlobPresent, true);
}

function entityRegistryExposesAdapterCapabilities(): void {
  const registry = EntityRegistry.defaults();
  const adapter = registry.adapter("text/csv");
  const diff = adapter.diff?.("id,name\n1,Alice\n", "id,name\n1,Alice\n2,Bob\n");
  const redacted = adapter.redact?.("id,secret\n1,token\n", ["secret"]);

  assert.equal(adapter.entityType, "text/csv");
  assert.ok(Array.isArray(diff));
  assert.equal(redacted, "id,secret\n1,[redacted]\n");
}

function customSerializationProviderRoundTripsEvents(): void {
  const root = mkdtempSync(join(tmpdir(), "epoch-toon-"));
  const repository = new EpochRepository(root, { serializer: createToonSerializationProvider() });
  repository.init("alice");
  writeFileSync(join(root, "note.txt"), "hello\n", "utf8");
  const event = repository.recordFile("note.txt", "text/plain");

  assert.equal(repository.read(event.id).id, event.id);
  assert.ok(repository.events().every((candidate) => candidate.id.length > 0));
  assert.deepEqual(repository.verify(), []);
}
