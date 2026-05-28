import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type BrowserContext, type Page, type Video } from "playwright";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";
import {
  createCommunityOperationsWebApp,
  renderCommunityOperationsDocument,
  type CommunityOperationsWebAppDefinition,
} from "@epoch/community-operations-web";

interface CommunityOperationsState {
  app?: CommunityOperationsWebAppDefinition;
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
}

let communityOperationsState: CommunityOperationsState = {};

async function closeWithTimeout(task: Promise<unknown> | undefined, label: string, timeoutMs = 5_000) {
  if (!task) return;

  await Promise.race([
    task,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

After(async function () {
  const video = communityOperationsState.page?.video();

  try {
    await closeWithTimeout(communityOperationsState.page?.close(), "community operations page close");
    await closeWithTimeout(communityOperationsState.context?.close(), "community operations context close");
    await closeWithTimeout(communityOperationsState.browser?.close(), "community operations browser close");
    await persistVideoEvidence(video);
  } finally {
    communityOperationsState = {};
  }
});

Given("an Epoch Platform project with repository-hosted code, runner, workflow run, and agent sandbox", async function () {
  const sdk = new EpochPlatformSdk(createInMemoryPlatformCore({ communityEnabled: true }));
  const organization = sdk.organizations.create({ slug: "epoch", displayName: "Epoch" });
  const project = sdk.projects.create({ organizationId: organization.id, slug: "community", displayName: "Community" });
  const repository = sdk.repositories.create({ projectId: project.id, slug: "epoch/community", visibility: "public" });
  const environment = sdk.environments.create({ projectId: project.id, name: "preview", type: "preview", protected: false });
  const deployable = sdk.deployables.create({
    projectId: project.id,
    name: "dashboard-web",
    kind: "app",
    runtime: "node20",
    source: { repositoryId: repository.id },
  });
  sdk.runners.register({ name: "runner-a", capacity: 2 });
  const plan = sdk.deployments.createPlan({ deployableId: deployable.id, environmentId: environment.id });
  sdk.deployments.executePlan(plan.id);
  const workflowJob = sdk.jobs.schedule({
    name: "github-actions-ci",
    type: "github-actions",
    idempotencyKey: "github-actions-ci-1",
  });
  const aiPlan = sdk.ai.createActionPlan({ projectId: project.id, action: "agent sandbox: draft dashboard widget" });
  sdk.ai.approveActionPlan(aiPlan.id, { actor: "maya" });
  sdk.ai.executeActionPlan(aiPlan.id);

  communityOperationsState.app = await createCommunityOperationsWebApp({
    platform: sdk,
    projectId: project.id,
    workflowAutomations: [{
      id: "github-actions-ci",
      name: "GitHub Actions CI",
      source: "github-actions",
      workflowPath: ".github/workflows/ci.yml",
      trigger: "pull_request",
    }],
    workflowRuns: [{
      id: "workflow-run-ci",
      automationId: "github-actions-ci",
      jobId: workflowJob.id,
      state: "succeeded",
      signedEventId: "event-workflow-ci",
    }],
    sandboxRuns: [{
      id: "sandbox-region-widget",
      aiPlanId: aiPlan.id,
      agent: "ui-agent",
      provider: "openai",
      model: "gpt-5",
      policy: "preview-safe",
      state: "executed",
      inputIntentId: "intent-region-widget",
      outputPatchId: "patch-region-widget",
      signedEventId: "event-agent-sandbox",
    }],
  });
});

When("I open the Epoch Community Operations extension in a Playwright browser", { timeout: 60_000 }, async function () {
  assert.ok(communityOperationsState.app);
  const evidenceDirectory = communityOperationsEvidenceDirectory();
  if (evidenceDirectory !== undefined) {
    mkdirSync(evidenceDirectory, { recursive: true });
  }

  communityOperationsState.browser = await chromium.launch({ headless: true });
  communityOperationsState.context = await communityOperationsState.browser.newContext({
    viewport: { width: 1280, height: 900 },
    ...(evidenceDirectory === undefined
      ? {}
      : { recordVideo: { dir: evidenceDirectory, size: { width: 1280, height: 900 } } }),
  });
  communityOperationsState.page = await communityOperationsState.context.newPage();
  await communityOperationsState.page.setContent(renderCommunityOperationsDocument(communityOperationsState.app));
  await communityOperationsState.page.locator("[data-design-system=\"epoch-community-operations\"]").waitFor({ timeout: 10_000 });
});

Then("the Community Operations browser shows hosted app {string}", async function (name: string) {
  await assertVisibleText(name);
});

Then("the Community Operations browser shows repository source {string}", async function (repository: string) {
  await assertVisibleText(repository);
});

Then("the Community Operations browser shows runtime {string}", async function (runtime: string) {
  await assertVisibleText(runtime);
});

Then("the Community Operations browser shows workflow {string}", async function (name: string) {
  await assertVisibleText(name);
});

Then("the Community Operations browser shows agent sandbox {string}", async function (name: string) {
  await assertVisibleText(name);
});

Then("the Community Operations browser shows sandbox output patch {string}", async function (patchId: string) {
  await assertVisibleText(patchId);
});

Then("the Community Operations browser shows runner {string}", async function (name: string) {
  await assertVisibleText(name);
});

Then("the Community Operations browser shows signed provenance {string}", async function (eventId: string) {
  await assertVisibleText(eventId);
});

Then("the Community Operations browser exposes action {string}", async function (action: string) {
  assert.ok(communityOperationsState.page);
  await communityOperationsState.page.getByRole("link", { name: action }).first().waitFor({ timeout: 10_000 });
});

Then("the Community Operations browser presents a visually validated operations dashboard", async function () {
  assert.ok(communityOperationsState.page);
  const page = communityOperationsState.page;

  const designRoot = page.locator("[data-design-system=\"epoch-community-operations\"]");
  assert.equal(await designRoot.count(), 1);
  assert.equal(await page.locator("a.skip-link[href=\"#operations-content\"]").count(), 1);

  const surfaceToken = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ops-surface")
      .trim(),
  );
  assert.equal(surfaceToken, "#f4f7f5");

  for (const heading of ["Apps", "Previews", "Workflows", "Agent Sandboxes", "Runners", "Activity"]) {
    await page.getByRole("heading", { name: heading }).waitFor({ timeout: 10_000 });
  }

  const dashboardBox = await page.locator(".ops-grid").boundingBox();
  assert.ok(dashboardBox);
  assert.ok(dashboardBox.width >= 900, "expected desktop operations grid width");
  assert.ok(dashboardBox.height >= 500, "expected visible operations grid height");

  const firstCardBox = await page.locator(".ops-card").first().boundingBox();
  assert.ok(firstCardBox);
  assert.ok(firstCardBox.width >= 280, "expected usable operations card width");
  assert.ok(firstCardBox.height >= 150, "expected usable operations card height");

  const screenshot = await page.screenshot({ fullPage: true });
  assert.ok(screenshot.byteLength > 10_000, "expected non-empty Community Operations browser screenshot evidence");
});

async function assertVisibleText(expected: string): Promise<void> {
  assert.ok(communityOperationsState.page);
  const text = await communityOperationsState.page.locator("body").innerText();
  assert.match(text, new RegExp(escapeRegExp(expected), "iu"));
}

async function persistVideoEvidence(video: Video | null | undefined): Promise<void> {
  const evidenceDirectory = communityOperationsEvidenceDirectory();
  if (video == null || evidenceDirectory === undefined) {
    return;
  }

  const videoPath = await video.path();
  const targetPath = join(evidenceDirectory, process.env.EPOCH_COMMUNITY_OPERATIONS_E2E_VIDEO_NAME ?? "community_operations.webm");
  copyFileSync(videoPath, targetPath);
  if (resolve(videoPath) !== resolve(targetPath)) {
    rmSync(videoPath, { force: true });
  }
  assert.ok(statSync(targetPath).size > 1_000, "expected recorded Community Operations WebM evidence");
}

function communityOperationsEvidenceDirectory(): string | undefined {
  const directory = process.env.EPOCH_COMMUNITY_OPERATIONS_E2E_ARTIFACT_DIR;
  return directory === undefined || directory.length === 0 ? undefined : resolve(directory);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
