/**
 * Bundle Canvas UI vanilla effects for the static Community Web landing.
 *
 *   node packages/Epoch.Community.Web/scripts/build-canvasui-landing.mjs
 *
 * Zero-dep effects → canvasui-fx.js (IIFE on window.CW_CanvasUI)
 */
import esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

// Generators live in scripts/; everything they emit belongs to the app.
const here = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const root = join(here, "../../..");
const canvasui = join(root, "components/canvasui");

const fxEntry = join(here, ".canvasui-fx-entry.ts");

writeFileSync(
  fxEntry,
  `
export { createAsciify, supportsHtmlInCanvas as asciifySupported } from "${canvasui}/AsciifyVanilla.ts";
export { createDecryptReveal, supportsHtmlInCanvas as decryptSupported } from "${canvasui}/DecryptRevealVanilla.ts";
export { createGlitch, supportsHtmlInCanvas as glitchSupported } from "${canvasui}/GlitchVanilla.ts";
export { createVHS, supportsHtmlInCanvas as vhsSupported } from "${canvasui}/VHSVanilla.ts";
`.trimStart(),
);

await esbuild.build({
  entryPoints: [fxEntry],
  bundle: true,
  format: "iife",
  globalName: "CW_CanvasUI",
  outfile: join(here, "canvasui-fx.js"),
  platform: "browser",
  target: ["es2020"],
  logLevel: "info",
});

console.log("Wrote canvasui-fx.js (IIFE)");
