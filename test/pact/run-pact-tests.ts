/**
 * Official Pact consumer + provider verification entrypoint.
 * Consumer tests write contracts into ./pacts; provider tests verify them
 * against live local providers (Community API HTTP adapter + Gossip HTTP).
 *
 * @see https://docs.pact.io/
 * @see https://docs.pact.io/implementation_guides/javascript/docs/consumer
 * @see https://github.com/pact-foundation/pact-js/blob/master/docs/provider.md
 */
import { runCommunityContractTests } from "../unit/community-contract.test";
import { runGossipHttpConsumerContractTests } from "./consumer/gossip-http.consumer.test";
import { runCommunityApiProviderVerification } from "./provider/community-api.provider.test";
import { runGossipHttpProviderVerification } from "./provider/gossip-http.provider.test";

async function main(): Promise<void> {
  console.log("pact: running consumer contract tests...");
  await runCommunityContractTests();
  await runGossipHttpConsumerContractTests();
  console.log("pact: consumer contracts written to ./pacts");

  console.log("pact: verifying providers against local pacts...");
  await runCommunityApiProviderVerification();
  await runGossipHttpProviderVerification();
  console.log("pact: provider verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
