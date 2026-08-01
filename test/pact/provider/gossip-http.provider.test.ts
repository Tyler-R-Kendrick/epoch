import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Verifier } from "@pact-foundation/pact";
import { EpochRepository, startGossipServer } from "@epoch/core";
import { PACT_DIR, PactProviders } from "../helpers";

/**
 * Provider verification: Epoch.Core.GossipHttp against consumer pacts.
 * @see https://docs.pact.io/getting_started/verifying_pacts
 */
export async function runGossipHttpProviderVerification(): Promise<void> {
  const pactUrls = listPactsForProvider(PactProviders.gossipHttp);
  if (pactUrls.length === 0) {
    throw new Error(
      `No consumer pacts found for ${PactProviders.gossipHttp} in ${PACT_DIR}. Run consumer contract tests first.`,
    );
  }

  const root = mkdtempSync(join(tmpdir(), "epoch-pact-gossip-provider-"));
  try {
    const epochRoot = join(root, "repo");
    mkdirSync(epochRoot);
    const repository = new EpochRepository(epochRoot);
    repository.init("provider");
    writeFileSync(join(epochRoot, "seed.txt"), "seed\n");
    repository.recordFile("seed.txt", "text/plain", "provider");

    const server = await startGossipServer(repository, { host: "127.0.0.1", port: 0 });
    try {
      await new Verifier({
        provider: PactProviders.gossipHttp,
        providerBaseUrl: server.url,
        pactUrls,
        logLevel: "error",
        stateHandlers: {
          "gossip peer repository is initialized": async () => {
            // Seeded repository already initialized.
          },
        },
      }).verifyProvider();
    } finally {
      await server.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  assert.ok(true, "Gossip HTTP provider verification completed");
}

function listPactsForProvider(provider: string): string[] {
  if (!existsSync(PACT_DIR)) return [];
  return readdirSync(PACT_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(PACT_DIR, name))
    .filter((path) => {
      try {
        const parsed = JSON.parse(readFileSync(path, "utf8")) as {
          provider?: { name?: string };
        };
        return parsed.provider?.name === provider;
      } catch {
        return false;
      }
    });
}
