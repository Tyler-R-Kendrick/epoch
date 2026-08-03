import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Bundles the real TypeScript client entry (src/client/main.ts) into a single
 * unminified IIFE at dist/client/runtime.js. render/document.ts inlines that
 * bundle into the self-contained Community Web page at render time.
 *
 * minify stays off on purpose: the parity test greps the shipped HTML for
 * messageMatchesReceiptSearch by name (EPX-D004 closed contract), and the
 * inline script remains debuggable in production pages.
 */
export default defineConfig({
  build: {
    target: "es2020",
    minify: false,
    outDir: "dist/client",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/client/main.ts"),
      name: "EpochCommunityClient",
      formats: ["iife"],
      fileName: () => "runtime.js",
    },
  },
});
