import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { After, Before, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page } from "playwright";
import {
  CommunityRepository,
  createCommunityClient,
  type CommunityClient,
} from "@epoch/community-core";
import { createInMemoryCommunityApi } from "@epoch/community-api";
import { main as communityCliMain } from "@epoch/community-cli";
import {
  CommunityWebAppDefinition,
  MaterializedCommunityWebSite,
  createCommunityWebApp,
  materializeCommunityWebSiteWithEpoch,
  renderCommunityWebDocument,
} from "@epoch/community-web";
import { PlatformWebAppDefinition, createPlatformWebApp } from "@epoch/platform-web";

interface PlatformWorld {
  client?: CommunityClient;
  community?: CommunityWebAppDefinition;
  web?: PlatformWebAppDefinition;
  repository?: CommunityRepository;
  cliStdout?: string;
  cliStderr?: string;
  cliExitCode?: number;
  browser?: Browser;
  page?: Page;
  siteBuild?: MaterializedCommunityWebSite;
}

let platformState: PlatformWorld;

async function closeWithTimeout(task: Promise<unknown> | undefined, label: string, timeoutMs = 5_000) {
  if (!task) return;

  await Promise.race([
    task,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

Before(function () {
  platformState = {
    client: createCommunityClient(createInMemoryCommunityApi()),
  };
});

After(async function () {
  await Promise.allSettled([
    closeWithTimeout(platformState.page?.close(), "community page close"),
    closeWithTimeout(platformState.browser?.close(), "community browser close"),
  ]);
});

Given("the Epoch Community API has a repository named {string}", async function (slug: string) {
  platformState.client = createCommunityClient(createInMemoryCommunityApi({
    repositories: [{
      slug,
      displayName: slug.split("/").at(-1) ?? slug,
      description: "Epoch community repository",
      maintainers: ["alice"],
      topics: ["epoch"],
    }],
  }));
});

Given("the Epoch Community Web app definition", async function () {
  assert.ok(platformState.client);
  platformState.community = await createCommunityWebApp({ client: platformState.client });
});

When("I register it with the Epoch Platform Web hosting app", function () {
  assert.ok(platformState.community);
  platformState.web = createPlatformWebApp({
    deployableApps: [platformState.community.deploymentTarget],
  });
});

Then("Epoch Platform Web manages the Community app as a deployable service", function () {
  assert.ok(platformState.web);
  assert.ok(platformState.web.managedServices.some((service) => service.id === "epoch-community"));
});

Then("Epoch Platform Web does not expose GitHub-style community workflows", function () {
  assert.ok(platformState.web);
  assert.deepEqual(platformState.web.communityWorkflows, []);
});

Then("Epoch Community Web exposes GitHub-style community workflows from Core", function () {
  assert.ok(platformState.community);
  assert.ok(platformState.community.workflows.some((workflow) => workflow.id === "repository-browsing"));
  assert.ok(platformState.community.workflows.some((workflow) => workflow.id === "issue-tracking"));
  assert.ok(platformState.community.workflows.some((workflow) => workflow.id === "change-review"));
});

Given("a Community repository named {string}", async function (slug: string) {
  assert.ok(platformState.client);
  platformState.repository = await platformState.client.createRepository({
    slug,
    displayName: slug.split("/").at(-1) ?? slug,
    description: "Epoch community repository",
    maintainers: ["alice"],
    topics: ["epoch"],
  });
});

When("a contributor uses Epoch Community Core to open an issue and propose a change", async function () {
  assert.ok(platformState.repository);
  assert.ok(platformState.client);
  platformState.repository = await platformState.client.openIssue(platformState.repository.slug, {
    title: "Separate hosting and community products",
    author: "bob",
    labels: ["architecture"],
  });
  platformState.repository = await platformState.client.proposeChange(platformState.repository.slug, {
    title: "Move community workflows into Community",
    author: "carol",
    sourceView: "carol/community-workflows",
    targetView: "main",
  });
});

Then("the Community project tracks the issue and proposal", function () {
  assert.ok(platformState.repository);
  assert.equal(platformState.repository.issues.length, 1);
  assert.equal(platformState.repository.changeProposals.length, 1);
});

Then("the Community project can record a maintainer review", function () {
  assert.ok(platformState.repository);
  assert.ok(platformState.client);
  const proposal = platformState.repository.changeProposals[0];
  assert.ok(proposal);
  return platformState.client.reviewChange(platformState.repository.slug, proposal.id, {
    reviewer: "alice",
    decision: "approved",
    body: "This belongs in Community.",
  }).then((repository) => {
    platformState.repository = repository;
    assert.equal(platformState.repository.changeProposals[0].status, "approved");
  });
});

When("I run the Epoch Community CLI to list repositories", async function () {
  assert.ok(platformState.client);
  const stdout: string[] = [];
  const stderr: string[] = [];
  platformState.cliExitCode = await communityCliMain(["repositories"], {
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  }, { client: platformState.client });
  platformState.cliStdout = stdout.join("\n");
  platformState.cliStderr = stderr.join("\n");
});

Then("the Epoch Community CLI output contains {string}", function (expected: string) {
  assert.equal(platformState.cliExitCode, 0);
  assert.equal(platformState.cliStderr, "");
  assert.match(platformState.cliStdout ?? "", new RegExp(expected.replace("/", "\\/"), "u"));
});

When("I open Epoch Community Web in a Playwright browser", { timeout: 60_000 }, async function () {
  assert.ok(platformState.client);
  platformState.community = await createCommunityWebApp({ client: platformState.client });
  platformState.browser = await chromium.launch();
  platformState.page = await platformState.browser.newPage();
  await platformState.page.setContent(renderCommunityWebDocument(platformState.community));
});

Then("the Community browser shows repository {string}", async function (slug: string) {
  assert.ok(platformState.page);
  await assertVisibleText(platformState.page, slug);
});

Then("the Community browser exposes workflow {string}", async function (workflow: string) {
  assert.ok(platformState.page);
  await assertVisibleText(platformState.page, workflow);
});

Then("the Community browser exposes the Epoch Community design system", async function () {
  assert.ok(platformState.page);

  const designRoot = platformState.page.locator("[data-design-system=\"epoch-community\"]");
  assert.equal(await designRoot.count(), 1);
  assert.equal(await platformState.page.locator("a.skip-link[href=\"#community-content\"]").count(), 1);

  const surfaceToken = await platformState.page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--epoch-color-surface")
      .trim(),
  );
  assert.equal(surfaceToken, "#eef3f1");

  const repositoryCard = platformState.page.locator(".repo-card").first();
  const repositoryCardBox = await repositoryCard.boundingBox();
  assert.ok(repositoryCardBox);
  assert.ok(repositoryCardBox.width >= 280);

  const navText = await platformState.page.locator("nav[aria-label=\"Community workflows\"]").innerText();
  assert.match(navText, /Repositories/u);
  assert.match(navText, /Change Reviews/u);
});

When("I materialize Epoch Community Web through an Epoch site repository", function () {
  assert.ok(platformState.community);
  const workspace = mkdtempSync(join(tmpdir(), "epoch-community-site-"));
  platformState.siteBuild = materializeCommunityWebSiteWithEpoch(platformState.community, {
    repositoryRoot: join(workspace, "repository"),
    outputDirectory: join(workspace, "deploy"),
  });
});

Then("the Community site history verifies successfully", function () {
  assert.ok(platformState.siteBuild);
  assert.deepEqual(platformState.siteBuild.history.verifyProblems, []);
});

Then("the Community site history includes view {string}", function (view: string) {
  assert.ok(platformState.siteBuild);
  assert.ok(platformState.siteBuild.history.views.includes(view));
});

Then("the Community site history includes event type {string}", function (eventType: string) {
  assert.ok(platformState.siteBuild);
  assert.ok(platformState.siteBuild.history.eventTypes.includes(eventType));
});

Then("the Community site materialized version includes file {string}", function (path: string) {
  assert.ok(platformState.siteBuild);
  assert.ok(platformState.siteBuild.materializedFiles.includes(path));
});

async function assertVisibleText(page: Page, expected: string): Promise<void> {
  const text = await page.locator("body").innerText();
  assert.match(text, new RegExp(expected.replace("/", "\\/"), "u"));
}
