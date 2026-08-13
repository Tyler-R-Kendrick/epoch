import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";

/**
 * Package the Community Web app for deployment.
 *
 * The generated runtimes are rebuilt from package sources first, so what ships
 * is what the packages currently say rather than whatever was last committed
 * into the app directory. Deploying a stale generated bundle is how a browser
 * app and the library it claims to embed drift apart without anyone noticing.
 */
const sourceDirectory = resolve("packages/Epoch.Community.Web/app");
const outputDirectory = resolve(outputDirectoryFromArgs(process.argv.slice(2))
  ?? "packages/Epoch.Community.Web/.vercel-output");
const runtimeExtensions = new Set([".css", ".html", ".jpg", ".js", ".png", ".svg", ".webp"]);
const excludedFiles = new Set(["progress.html"]);

const sourceFromOutput = relative(outputDirectory, sourceDirectory);
if (sourceFromOutput === "" ||
    (sourceFromOutput !== ".." && !sourceFromOutput.startsWith(`..${sep}`) && !isAbsolute(sourceFromOutput))) {
  throw new Error("--output must not contain the Community Web source directory");
}

// Guard first, then generate: a bad --output must fail before anything writes.
for (const generator of ["build-core-runtime.mjs", "build-openui.mjs", "build-graphql.mjs"]) {
  execFileSync(process.execPath, [join("packages", "Epoch.Community.Web", "scripts", generator)], { stdio: "inherit" });
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || excludedFiles.has(entry.name) || !runtimeExtensions.has(extname(entry.name))) {
    continue;
  }
  await copyFile(join(sourceDirectory, entry.name), join(outputDirectory, entry.name));
}

await writeFile(join(outputDirectory, "healthz"), "ok\n");

function outputDirectoryFromArgs(args) {
  const index = args.indexOf("--output");
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--output requires a directory");
  }
  return value;
}
