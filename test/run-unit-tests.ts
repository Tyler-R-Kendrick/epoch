import { runWasmReactShadowDomTests } from "./component/wasm-react-shadow-dom.test";
import { runWasmReactStoreTests } from "./unit/wasm-react-store.test";

async function main(): Promise<void> {
  runWasmReactStoreTests();
  await runWasmReactShadowDomTests();
  console.log("unit and component tests passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
