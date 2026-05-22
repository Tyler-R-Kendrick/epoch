import { runPlatformWebConsoleTests } from "./component/platform-web-console.test";
import { runAdvancedInfrastructureTests } from "./unit/advanced-infrastructure.test";
import { runCommunityContractTests } from "./unit/community-contract.test";
import { runCommunityCoverageTests } from "./unit/community-coverage.test";
import { runCommunityWebVercelTests } from "./unit/community-web-vercel.test";
import { runEpochIntegrationSuiteTests } from "./unit/epoch-integration-suite.test";
import { runPlatformBoundaryTests } from "./unit/platform-boundaries.test";
import { runPlatformCommunityModuleTests } from "./unit/platform-community-module.test";
import { runPlatformProductionCoreTests } from "./unit/platform-production-core.test";
import { runSampleHelloWorldCliTests } from "./unit/sample-hello-world-cli.test";
import { runSampleSelfEvolvingCanvasTests } from "./unit/sample-self-evolving-canvas.test";
import { runSampleSelfEvolvingDashboardTests } from "./unit/sample-self-evolving-dashboard.test";
import { runWasmReactShadowDomTests } from "./component/wasm-react-shadow-dom.test";
import { runWasmReactStoreTests } from "./unit/wasm-react-store.test";

async function main(): Promise<void> {
  runAdvancedInfrastructureTests();
  runPlatformProductionCoreTests();
  await runPlatformCommunityModuleTests();
  runPlatformWebConsoleTests();
  await runCommunityContractTests();
  await runCommunityCoverageTests();
  await runCommunityWebVercelTests();
  await runEpochIntegrationSuiteTests();
  await runPlatformBoundaryTests();
  runWasmReactStoreTests();
  runSampleHelloWorldCliTests();
  runSampleSelfEvolvingCanvasTests();
  runSampleSelfEvolvingDashboardTests();
  await runWasmReactShadowDomTests();
  console.log("unit and component tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
