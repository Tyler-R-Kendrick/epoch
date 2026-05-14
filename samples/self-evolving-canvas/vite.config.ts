import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@epoch/wasm-react": fileURLToPath(new URL("../../packages/Epoch.WASM.React/src/index.ts", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
  },
});
