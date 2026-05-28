import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { createCommunityWebApp, materializeCommunityWebSiteWithEpoch } from "@epoch/community-web";

interface VercelConfig {
  readonly installCommand?: string;
  readonly buildCommand?: string;
  readonly outputDirectory?: string;
  readonly rewrites?: readonly {
    readonly source: string;
    readonly destination: string;
  }[];
}

export async function runCommunityWebVercelTests(): Promise<void> {
  vercelConfigBuildsTheCommunityWebOutput();
  await communityWebMaterializesTheSiteThroughEpochHistory();
  renderScriptProducesDeployableCommunityHtml();
}

function vercelConfigBuildsTheCommunityWebOutput(): void {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;

  assert.equal(config.installCommand, "npm install");
  assert.equal(config.buildCommand, "npm run build && npm run vercel:community-web");
  assert.equal(config.outputDirectory, "packages/Epoch.Community.Web/.vercel-output");
  assert.deepEqual(config.rewrites?.map((rewrite) => rewrite.source), [
    "/",
    "/community/(.*)",
    "/healthz",
  ]);
}

function renderScriptProducesDeployableCommunityHtml(): void {
  const outputDirectory = mkdtempSync(join(tmpdir(), "epoch-community-web-"));

  execFileSync(process.execPath, [
    "scripts/render-community-web.mjs",
    "--output",
    outputDirectory,
  ], { stdio: "pipe" });

  const html = readFileSync(join(outputDirectory, "community", "index.html"), "utf8");
  assert.match(html, /<h1>Epoch Community<\/h1>/u);
  assert.match(html, /epoch\/epoch/u);
  assert.match(html, /This site is built with Epoch/u);
  assert.match(html, /Branchable site changes/u);
  assert.match(html, /href="\/community\/repository-browsing"/u);
  assert.ok(existsSync(join(outputDirectory, "community", "epoch-repository.json")));
  assert.match(html, /data-design-system="epoch-community"/u);
  assert.match(html, /href="#community-content">Skip to content/u);
  assert.match(html, /--epoch-color-surface: #eef3f1/u);
  assert.match(html, /class="workflow-rail"/u);
  assert.match(html, /class="repo-card"/u);
  assert.equal(readFileSync(join(outputDirectory, "healthz"), "utf8"), "ok\n");
}

async function communityWebMaterializesTheSiteThroughEpochHistory(): Promise<void> {
  const workspace = mkdtempSync(join(tmpdir(), "epoch-community-dogfood-"));
  const outputDirectory = join(workspace, "deploy");
  const app = await createCommunityWebApp({
    client: createInMemoryCommunityApi({
      repositories: [{
        slug: "epoch/epoch",
        displayName: "Epoch",
        description: "Event-driven DVCS",
        maintainers: ["alice"],
      }],
    }),
  });

  const result = materializeCommunityWebSiteWithEpoch(app, {
    repositoryRoot: join(workspace, "site-repository"),
    outputDirectory,
  });

  assert.equal(result.history.verifyProblems.length, 0);
  assert.equal(result.history.currentView, "main");
  assert.equal(result.history.latestVersion.name, "community-site-dogfooded");
  assert.ok(result.history.views.includes("site/community-web-dogfood"));
  assert.ok(result.history.eventTypes.includes("record"));
  assert.ok(result.history.eventTypes.includes("view-definition"));
  assert.ok(result.history.eventTypes.includes("approval"));
  assert.ok(result.history.eventTypes.includes("rollback"));
  assert.ok(result.history.eventTypes.includes("version"));
  assert.ok(result.materializedFiles.includes("community/index.html"));
  assert.ok(result.materializedFiles.includes("community/epoch-site-history.json"));

  const html = readFileSync(join(outputDirectory, "community", "index.html"), "utf8");
  assert.match(html, /This site is built with Epoch/u);
  assert.match(html, /Branchable site changes/u);
  assert.match(html, /Rollback target/u);

  const manifest = JSON.parse(readFileSync(join(outputDirectory, "epoch-version.json"), "utf8")) as {
    readonly name: string;
    readonly files: readonly { readonly path: string }[];
  };
  assert.equal(manifest.name, "community-site-dogfooded");
  assert.ok(manifest.files.some((file) => file.path === "community/index.html"));

  const repositoryExport = JSON.parse(readFileSync(join(outputDirectory, "community", "epoch-repository.json"), "utf8")) as {
    readonly events: readonly unknown[];
    readonly heads: readonly string[];
  };
  assert.ok(repositoryExport.events.length >= 7);
  assert.ok(repositoryExport.heads.length > 0);
}
