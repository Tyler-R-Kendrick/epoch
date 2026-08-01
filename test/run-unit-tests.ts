import { runPlatformWebConsoleTests } from "./component/platform-web-console.test";
import { runAdvancedInfrastructureTests } from "./unit/advanced-infrastructure.test";
import { runCommunityContractTests } from "./unit/community-contract.test";
import { runCommunityCoverageTests } from "./unit/community-coverage.test";
import { runCommunityWebVercelTests } from "./unit/community-web-vercel.test";
import { runEpochIntegrationSuiteTests } from "./unit/epoch-integration-suite.test";
import { runEpochLiveReduxTests } from "./unit/epoch-live-redux.test";
import { runEpochLiveStoreTests } from "./unit/epoch-live-store.test";
import { runEpochLiveYjsTests } from "./unit/epoch-live-yjs.test";
import { runPlatformBoundaryTests } from "./unit/platform-boundaries.test";
import { runPlatformCommunityModuleTests } from "./unit/platform-community-module.test";
import { runPlatformProductionCoreTests } from "./unit/platform-production-core.test";
import { runPersonaFeatureModelTests } from "./unit/persona-feature-model.test";
import { runEpochLiveReactTests } from "./component/epoch-live-react.test";
import { runSampleEpochLiveCollabTests } from "./unit/sample-epoch-live-collab.test";
import { runSampleHelloWorldCliTests } from "./unit/sample-hello-world-cli.test";
import { runSampleSelfEvolvingCanvasTests } from "./unit/sample-self-evolving-canvas.test";
import { runSampleSelfEvolvingDashboardTests } from "./unit/sample-self-evolving-dashboard.test";
import { runVirtualCheckoutTests } from "./unit/virtual-checkout.test";
import { runWasmReactShadowDomTests } from "./component/wasm-react-shadow-dom.test";
import { runWasmReactStoreTests } from "./unit/wasm-react-store.test";
import { runGitProjectionTests } from "./unit/git-projection.test";
import { runGitProxyTests } from "./unit/git-proxy.test";
import { runAtprotoCommunityTests } from "./unit/atproto-community.test";
import { runGossipAtprotoIntegrationTests } from "./unit/gossip-atproto-integration.test";
import { runIdentityBridgeTests } from "./unit/identity-bridge.test";

async function main(): Promise<void> {
  runAdvancedInfrastructureTests();
  runPlatformProductionCoreTests();
  await runPlatformCommunityModuleTests();
  runPlatformWebConsoleTests();
  await runCommunityContractTests();
  // Gossip HTTP consumer contracts (writes durable pacts/ for provider verification).
  const { runGossipHttpConsumerContractTests } = await import("./pact/consumer/gossip-http.consumer.test");
  await runGossipHttpConsumerContractTests();
  await runCommunityCoverageTests();
  await runCommunityWebVercelTests();
  await runEpochIntegrationSuiteTests();
  await runPlatformBoundaryTests();
  runPersonaFeatureModelTests();
  runWasmReactStoreTests();
  runEpochLiveStoreTests();
  runEpochLiveReduxTests();
  runEpochLiveYjsTests();
  runSampleEpochLiveCollabTests();
  runSampleHelloWorldCliTests();
  runSampleSelfEvolvingCanvasTests();
  runSampleSelfEvolvingDashboardTests();
  runVirtualCheckoutTests();
  runGitProjectionTests();
  await runGitProxyTests();
  await runAtprotoCommunityTests();
  await runGossipAtprotoIntegrationTests();
  await runIdentityBridgeTests();
  await runWasmReactShadowDomTests();
  await runEpochLiveReactTests();
  console.log("unit and component tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
