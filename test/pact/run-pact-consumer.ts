import { runCommunityContractTests } from "../unit/community-contract.test";
import { runGossipHttpConsumerContractTests } from "./consumer/gossip-http.consumer.test";

async function main(): Promise<void> {
  await runCommunityContractTests();
  await runGossipHttpConsumerContractTests();
  console.log("pact consumer contracts passed (see ./pacts)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
