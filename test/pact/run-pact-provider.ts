import { runCommunityApiProviderVerification } from "./provider/community-api.provider.test";
import { runGossipHttpProviderVerification } from "./provider/gossip-http.provider.test";

async function main(): Promise<void> {
  await runCommunityApiProviderVerification();
  await runGossipHttpProviderVerification();
  console.log("pact provider verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
