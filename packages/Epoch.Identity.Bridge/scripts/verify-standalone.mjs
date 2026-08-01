#!/usr/bin/env node
/**
 * Standalone third-party style verifier (Section 10 gate).
 * Uses only published protocol data interfaces — index is offline.
 *
 * Usage (fixture mode):
 *   node packages/Epoch.Identity.Bridge/scripts/verify-standalone.mjs --fixture packages/Epoch.Identity.Bridge/test-vectors/valid-binding.json
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

async function main() {
  const args = process.argv.slice(2);
  const fixtureIdx = args.indexOf("--fixture");
  if (fixtureIdx === -1 || args[fixtureIdx + 1] === undefined) {
    console.error("Usage: verify-standalone.mjs --fixture <path-to-vector.json>");
    process.exit(2);
  }

  const bridge = await import("../dist/index.js");
  const fixture = JSON.parse(readFileSync(args[fixtureIdx + 1], "utf8"));

  const didResolver = new bridge.StaticDidResolver([fixture.didDocument]);

  // Prefer protocol-shaped deterministic verifier when the fixture carries a signed slice.
  // Fall back to Mock only for legacy fixtures — never invents bindings either way.
  let atProofVerifier;
  if (fixture.protocol === true || fixture.atProof?.carSliceB64?.length > 20) {
    atProofVerifier = new bridge.ProtocolAtProofVerifier();
  } else {
    atProofVerifier = new bridge.MockAtProofVerifier();
    atProofVerifier.register(fixture.didDocument.id, fixture.nostrEvent.pubkey, fixture.atProof);
  }

  const result = await bridge.verifyBinding({
    nostrEvent: fixture.nostrEvent,
    nostrChain: fixture.nostrChain,
    carSliceB64: fixture.atProof.carSliceB64,
    didResolver,
    atProofVerifier,
    pinnedHead: fixture.pinnedHead,
    nowUnix: fixture.nowUnix,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid || result.reason === "revoked" || result.reason === "expired" ? 0 : 1);
}

const isMain = process.argv[1] && (
  import.meta.url === pathToFileURL(process.argv[1]).href
  || process.argv[1].endsWith("verify-standalone.mjs")
);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
