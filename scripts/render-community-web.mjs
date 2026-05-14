import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "../packages/Epoch.Community.API/dist/index.js";
import {
  createCommunityWebApp,
  renderCommunityWebDocument,
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
});
const document = renderCommunityWebDocument(app);

await mkdir(join(outputDirectory, "community"), { recursive: true });
await writeFile(join(outputDirectory, "community", "index.html"), document);
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
