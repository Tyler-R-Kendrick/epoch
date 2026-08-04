import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "../packages/Epoch.Community.API/dist/index.js";
import {
  createCommunityWebApp,
  materializeCommunityWebSiteWithEpoch,
  renderServiceWorker,
  renderWebManifest,
} from "../packages/Epoch.Community.Web/dist/index.js";

const outputDirectory = outputDirectoryFromArgs(process.argv.slice(2))
  ?? "packages/Epoch.Community.Web/.vercel-output";

const api = createInMemoryCommunityApi({
  repositories: [{
    slug: "epoch/epoch",
    displayName: "Epoch",
    description: "Event-driven version control for signed, collaborative repository history.",
    maintainers: ["epoch-maintainers"],
    topics: ["dvcs", "crdt", "community"],
  }],
});

const app = await createCommunityWebApp({
  client: api,
  basePath: "/community",
  apiBaseUrl: process.env.EPOCH_COMMUNITY_API_URL,
});
const repositoryRoot = await mkdtemp(join(tmpdir(), "epoch-community-web-repository-"));

materializeCommunityWebSiteWithEpoch(app, {
  repositoryRoot,
  outputDirectory,
});
// PWA shell assets sit beside the page so the descriptor's offlineShell claim
// is actually backed by a manifest and a service worker.
await writeFile(join(outputDirectory, "community", "manifest.webmanifest"), renderWebManifest(app));
await writeFile(join(outputDirectory, "community", "sw.js"), renderServiceWorker(app));
await writeFile(join(outputDirectory, "healthz"), "ok\n");

function outputDirectoryFromArgs(args) {
  const index = args.indexOf("--output");
  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--output requires a directory");
  }

  return value;
}
