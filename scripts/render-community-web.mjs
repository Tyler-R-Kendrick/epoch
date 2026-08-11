import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";

const sourceDirectory = resolve("docs/design-explorations/nightboard");
const outputDirectory = resolve(outputDirectoryFromArgs(process.argv.slice(2))
  ?? "packages/Epoch.Community.Web/.vercel-output");
const runtimeExtensions = new Set([".css", ".html", ".jpg", ".js", ".png", ".svg", ".webp"]);
const excludedFiles = new Set(["progress.html"]);

const sourceFromOutput = relative(outputDirectory, sourceDirectory);
if (sourceFromOutput === "" ||
    (sourceFromOutput !== ".." && !sourceFromOutput.startsWith(`..${sep}`) && !isAbsolute(sourceFromOutput))) {
  throw new Error("--output must not contain the Nightboard source directory");
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
