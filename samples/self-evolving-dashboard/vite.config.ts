import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@epoch/gen-ui": fileURLToPath(new URL("../../packages/Epoch.GenUI/src/index.ts", import.meta.url)),
      "@epoch/integration-core": fileURLToPath(new URL("../../packages/Epoch.Integration.Core/src/index.ts", import.meta.url)),
      "@epoch/react": fileURLToPath(new URL("../../packages/Epoch.React/src/index.ts", import.meta.url)),
      "@epoch/wasm-react": fileURLToPath(new URL("../../packages/Epoch.WASM.React/src/index.ts", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
  },
});
