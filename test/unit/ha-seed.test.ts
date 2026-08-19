import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { bootstrapFromSeed, bootstrapFromSeeds, EpochRepository, SeedNodeService } from "@epoch/core";

export async function runHaSeedTests(): Promise<void> {
  const seedRoot = mkdtempSync(join(tmpdir(), "epoch-seed-src-"));
  const peerRoot = mkdtempSync(join(tmpdir(), "epoch-seed-peer-"));
  const missingRoot = join(tmpdir(), `epoch-seed-missing-${Date.now()}`);
  try {
    const seed = new EpochRepository(seedRoot);
    seed.init("alice");
    writeFileSync(join(seedRoot, "note.txt"), "seed\n");
    seed.recordFile("note.txt", "text/plain");

    const peer = new EpochRepository(peerRoot);
    const result = await bootstrapFromSeed(peer, {
      peerId: seed.identity(),
      multiaddr: pathToFileURL(seedRoot).href,
      trustLevel: "partial",
    });
    assert.ok(result.eventsCopied >= 1);

    await assert.rejects(
      () => bootstrapFromSeeds(new EpochRepository(mkdtempSync(join(tmpdir(), "epoch-seed-fail-"))), [{
        peerId: "nobody",
        multiaddr: missingRoot,
        trustLevel: "full",
      }]),
      /all seed bootstraps failed/,
    );

    const service = new SeedNodeService(seedRoot);
    service.start("alice");
    const compactId = service.createCompact();
    assert.ok(compactId.length > 0);
  } finally {
    rmSync(seedRoot, { recursive: true, force: true });
    rmSync(peerRoot, { recursive: true, force: true });
  }
}
