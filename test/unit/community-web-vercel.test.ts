import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  assert.match(html, /href="\/community\/repository-browsing"/u);
  assert.equal(readFileSync(join(outputDirectory, "healthz"), "utf8"), "ok\n");
}
