import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EpochRepository,
  ExitBundleError,
  exportExitBundle,
  importExitBundle,
  migrateCommunity,
  parseExitBundle,
} from "@epoch/core";

export function runExitBundleTests(): void {
  roundTripIdenticalVerifiedHistory();
  tamperDenied();
  truncationDenied();
  bindingsSurvive();
  craftedDowngradeDenied();
}

function freshRepo(author: string): EpochRepository {
  const root = mkdtempSync(join(tmpdir(), `epoch-exit-${author}-`));
  return EpochRepository.create(root, { author });
}

function roundTripIdenticalVerifiedHistory(): void {
  const source = freshRepo("maya");
  writeFileSync(join(source.root, "README.md"), "hello");
  source.recordFile("README.md", "text/plain");
  const bundle = exportExitBundle(source, {
    bindings: [{
      $type: "org.epoch.identity.binding",
      epochAuthorId: "maya",
      nostrPubkey: "a".repeat(64),
      bindingNonce: "b".repeat(64),
      bindingVersion: 1,
      seqno: 1,
      revoked: false,
      createdAt: "2026-01-01T00:00:00Z",
    }],
  });
  const dest = freshRepo("jules");
  importExitBundle(dest, bundle);
  const destIds = new Set(dest.events().map((event) => event.id));
  for (const event of source.events()) {
    assert.ok(destIds.has(event.id), `missing imported event ${event.id}`);
  }
  assert.deepEqual(dest.verify(), []);
  assert.equal(bundle.bindings[0]?.epochAuthorId, "maya");
}

function tamperDenied(): void {
  const source = freshRepo("maya");
  const bundle = exportExitBundle(source);
  const tampered = { ...bundle, events: [...bundle.events, { ...bundle.events[0], id: "forged" }] };
  assert.throws(() => parseExitBundle(tampered), (error) => error instanceof ExitBundleError);
}

function truncationDenied(): void {
  const source = freshRepo("maya");
  writeFileSync(join(source.root, "a.txt"), "a");
  source.recordFile("a.txt", "text/plain");
  writeFileSync(join(source.root, "b.txt"), "b");
  source.recordFile("b.txt", "text/plain");
  const bundle = exportExitBundle(source);
  assert.ok(bundle.events.length >= 2);
  const truncated = {
    ...bundle,
    events: bundle.events.slice(0, bundle.events.length - 1),
    manifest: { ...bundle.manifest, eventCount: bundle.events.length - 1 },
  };
  assert.throws(() => parseExitBundle(truncated), (error) => error instanceof ExitBundleError);
}

function bindingsSurvive(): void {
  const source = freshRepo("maya");
  const samePrincipalDifferentCommunities = [
    binding("maya", "community-a"),
    binding("maya", "community-b"),
  ];
  const bundle = exportExitBundle(source, { bindings: samePrincipalDifferentCommunities });
  assert.equal(bundle.bindings.length, 2);
  assert.notEqual(
    // SAFETY: Runtime checks or construction above establish { community?: string }).community.
    (bundle.bindings[0] as { community?: string }).community,
    undefined,
  );
}

function craftedDowngradeDenied(): void {
  const from = freshRepo("maya");
  const to = freshRepo("jules");
  assert.throws(() => migrateCommunity({
    from,
    to,
    fromPosture: { posture: "open" },
    toPosture: { posture: "hosted" },
  }), (error) => error instanceof ExitBundleError);
}

function binding(author: string, community: string) {
  return {
    $type: "org.epoch.identity.binding" as const,
    epochAuthorId: author,
    nostrPubkey: "c".repeat(64),
    bindingNonce: "d".repeat(64),
    bindingVersion: 1,
    seqno: 1,
    revoked: false,
    createdAt: "2026-01-01T00:00:00Z",
    community,
  };
}
