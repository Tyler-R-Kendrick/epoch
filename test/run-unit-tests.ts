import { runPlatformWebConsoleTests } from "./component/platform-web-console.test";
import { runAdvancedInfrastructureTests } from "./unit/advanced-infrastructure.test";
import { runCommunityContractTests } from "./unit/community-contract.test";
import { runCommunityCoverageTests } from "./unit/community-coverage.test";
import { runPlatformBoundaryTests } from "./unit/platform-boundaries.test";
import { runPlatformCommunityModuleTests } from "./unit/platform-community-module.test";
import { runPlatformProductionCoreTests } from "./unit/platform-production-core.test";
import { runSampleSelfEvolvingCanvasTests } from "./unit/sample-self-evolving-canvas.test";
import { runWasmReactShadowDomTests } from "./component/wasm-react-shadow-dom.test";
import { runWasmReactStoreTests } from "./unit/wasm-react-store.test";

async function main(): Promise<void> {
  runAdvancedInfrastructureTests();
  runPlatformProductionCoreTests();
  await runPlatformCommunityModuleTests();
  runPlatformWebConsoleTests();
  await runCommunityContractTests();
  await runCommunityCoverageTests();
  await runPlatformBoundaryTests();
  runWasmReactStoreTests();
  runSampleSelfEvolvingCanvasTests();
  await runWasmReactShadowDomTests();
  console.log("unit and component tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
