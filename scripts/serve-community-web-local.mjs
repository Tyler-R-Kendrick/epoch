#!/usr/bin/env node
/**
 * Local validation server for Community Web (channel shell + live Community API).
 *
 * Usage:
 *   node scripts/serve-community-web-local.mjs
 *   PORT=4391 node scripts/serve-community-web-local.mjs
 *
 * Serves HTML re-rendered from the live in-memory API on every page load so
 * composer posts, intents, comments, and reviews persist across refresh.
 */
import { createServer } from "node:http";
import { createInMemoryCommunityApi, createCommunityApiFetchHandler } from "../packages/Epoch.Community.API/dist/index.js";
import { createCommunityClient } from "../packages/Epoch.Community.Core/dist/index.js";
import { createCommunityWebApp, renderCommunityWebDocument } from "../packages/Epoch.Community.Web/dist/index.js";

const port = Number(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "127.0.0.1";
const apiBaseUrl = process.env.EPOCH_COMMUNITY_API_URL ?? `http://${host}:${port}`;

const api = createInMemoryCommunityApi({
  repositories: [{
    slug: "epoch/epoch",
    displayName: "Epoch",
    description: "Event-driven version control for signed, collaborative repository history.",
    maintainers: ["maya"],
    topics: ["dvcs", "agents", "community", "atproto"],
  }, {
    slug: "epoch/community-kit",
    displayName: "Community Kit",
    description: "Shared ATProto-facing community templates and feed seeds.",
    maintainers: ["lea"],
    topics: ["community", "atproto"],
  }],
});

await api.openIssue("epoch/epoch", {
  id: "IDEA-3",
  title: "Dashboard widget should group revenue by region",
  author: "nora",
  body: "The current widget answers total revenue, but support threads keep asking which region changed. Could this become a small widget setting instead of a separate report?",
  labels: ["idea"],
});
await api.openIssue("epoch/epoch", {
  id: "BUG-17",
  title: "Preview keyboard focus skips the chart setting",
  author: "ren",
  body: "The preview works visually, but tab order jumps from the toolbar to the footer.",
  labels: ["bug"],
});
await api.openIssue("epoch/epoch", {
  id: "IDEA-4",
  title: "Signed reaction summary on channel headers",
  author: "sam",
  body: "Maintainers want a compact count of intents and open reviews without opening each thread.",
  labels: ["idea"],
});
await api.openIssue("epoch/epoch", {
  id: "IDEA-5",
  title: "Agent run cards should link back to the originating intent",
  author: "lea",
  body: "When an agent posts a run, the message should carry a one-click path to the signed intent and patch preview.",
  labels: ["idea"],
});
await api.openIssue("epoch/epoch", {
  id: "BUG-18",
  title: "Composer loses draft when switching channels",
  author: "ren",
  body: "Draft text should stick per channel for the session so switching #ideas and #bugs does not discard work.",
  labels: ["bug"],
});
await api.proposeChange("epoch/epoch", {
  id: "CHANGE-12",
  title: "Keep preview cards attached to conversation state",
  author: "maya",
  body: "Preview status should stay attached to the conversation where review happens.",
  sourceView: "maya/preview-card-thread",
  targetView: "main",
});
await api.openIssue("epoch/community-kit", {
  id: "KIT-1",
  title: "Publish feed verb templates for AppView clients",
  author: "sam",
  body: "Standardize follow/star/create/release verb cards for Epoch Dev Feed consumers.",
  labels: ["idea"],
});

const apiHandler = createCommunityApiFetchHandler(api);
const client = createCommunityClient(api);

async function renderLiveDocument() {
  const app = await createCommunityWebApp({
    client,
    basePath: "/community",
    apiBaseUrl,
  });
  return renderCommunityWebDocument(app);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    const path = url.pathname;

    if (path === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ok\n");
      return;
    }

    if (
      path === "/workflows"
      || path === "/repositories"
      || path.startsWith("/repositories/")
    ) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      const request = new Request(url, {
        method: req.method ?? "GET",
        headers: req.headers,
        body: body.length === 0 || req.method === "GET" || req.method === "HEAD" ? undefined : body,
      });
      const response = await apiHandler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    if (path === "/" || path === "/community" || path === "/community/" || path === "/community/index.html") {
      const html = await renderLiveDocument();
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(html);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found\n");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, host, () => {
  console.log(`Epoch Community Web (live + seeded) → http://${host}:${port}/community`);
  console.log(`Healthz → http://${host}:${port}/healthz`);
  console.log(`API base → ${apiBaseUrl}`);
  console.log("Seeded: epoch/epoch + epoch/community-kit; Dev Feed social + contribution events");
  console.log("Writes persist in-process: compose, comment, intent, agent, docs, report, approve");
});
