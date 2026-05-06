import { runWasmReactShadowDomTests } from "./component/wasm-react-shadow-dom.test";
import { runAdvancedInfrastructureTests } from "./unit/advanced-infrastructure.test";
import { runWasmReactStoreTests } from "./unit/wasm-react-store.test";

async function main(): Promise<void> {
  runAdvancedInfrastructureTests();
  runWasmReactStoreTests();
  await runWasmReactShadowDomTests();
  console.log("unit and component tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
