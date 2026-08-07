/**
 * Bundle Canvas UI vanilla effects for the static Nightboard landing.
 *
 *   node docs/design-explorations/nightboard/build-canvasui-landing.mjs
 *
 * Zero-dep effects → canvasui-fx.js (IIFE on window.NB_CanvasUI)
 */
import esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
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
  globalName: "NB_CanvasUI",
  outfile: join(here, "canvasui-fx.js"),
  platform: "browser",
  target: ["es2020"],
  logLevel: "info",
});

console.log("Wrote canvasui-fx.js (IIFE)");
