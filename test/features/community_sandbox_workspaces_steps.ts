import assert from "node:assert/strict";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page } from "playwright";
import {
  createCommunityOperationsWebApp,
  renderCommunityOperationsDocument,
  type CommunitySandboxWorkspaceReview,
  type CommunitySandboxWorkspaceSession,
  type CommunitySandboxWorkspaceTemplate,
} from "@epoch/community-operations-web";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

interface CommunitySandboxWorkspaceWorld {
  sdk?: EpochPlatformSdk;
  projectId?: string;
  repositorySlug?: string;
  contributorName?: string;
  maintainerName?: string;
  template?: CommunitySandboxWorkspaceTemplate;
  session?: CommunitySandboxWorkspaceSession;
  review?: CommunitySandboxWorkspaceReview;
  browser?: Browser;
  page?: Page;
}

let sandboxWorkspaceState: CommunitySandboxWorkspaceWorld = {};

After(async function () {
  await Promise.allSettled([
    sandboxWorkspaceState.page?.close(),
    sandboxWorkspaceState.browser?.close(),
  ]);
  sandboxWorkspaceState = {};
});

Given("a GitHub open-source contributor named {string} opens repository {string}", function (contributorName: string, repositorySlug: string) {
  createCommunitySandboxWorkspaceProject(repositorySlug, "Contributor workspace", { contributorName });
});

When("{word} opens the repository workspace templates", function (contributorName: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.template);
});

When("{word} selects workspace template {string}", function (contributorName: string, templateName: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.template);
  sandboxWorkspaceState.template = {
    ...sandboxWorkspaceState.template,
    name: templateName,
  };
});

When(
  "{word} reviews cost owner {string} and security policy {string}",
  function (contributorName: string, costOwner: string, securityPolicy: string) {
    assert.equal(contributorName, sandboxWorkspaceState.contributorName);
    assert.ok(sandboxWorkspaceState.template);
    sandboxWorkspaceState.template = {
      ...sandboxWorkspaceState.template,
      costOwner,
      securityPolicy,
    };
  },
);

When("{word} launches a sandbox workspace for {string}", function (contributorName: string, goal: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.repositorySlug);
  assert.ok(sandboxWorkspaceState.template);
  sandboxWorkspaceState.session = {
    id: "workspace-region-revenue",
    templateId: sandboxWorkspaceState.template.id,
    repositorySlug: sandboxWorkspaceState.repositorySlug,
    developer: contributorName,
    goal,
    state: "running",
    changedFiles: [],
    checks: [],
    agentContext: "project norms and prior terminal history",
    recoveryState: "workspace state saved",
    actions: ["Open Workspace", "Run Checks", "Submit Patch Intent"],
  };
});

When("{word} changes {string} in the workspace", function (contributorName: string, changedFile: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.session);
  sandboxWorkspaceState.session = {
    ...sandboxWorkspaceState.session,
    changedFiles: [...sandboxWorkspaceState.session.changedFiles, changedFile],
  };
});

When("{word} runs checks for the workspace", function (contributorName: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.session);
  sandboxWorkspaceState.session = {
    ...sandboxWorkspaceState.session,
    state: "checks-passed",
    checks: ["typecheck passed", "unit tests passed"],
    actions: ["Open Workspace", "Submit Patch Intent"],
  };
});

When("{word} submits the workspace as patch intent {string}", function (contributorName: string, patchIntentId: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.session);
  sandboxWorkspaceState.session = {
    ...sandboxWorkspaceState.session,
    state: "submitted",
    patchIntentId,
    signedEventId: `event-${patchIntentId}`,
    recoveryState: "saved as signed workspace snapshot",
    actions: ["Open Workspace"],
  };
});

Then("{word} has a submitted sandbox workspace for {string}", async function (contributorName: string, goal: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(goal);
  await assertSandboxWorkspaceText("submitted");
});

Then("patch intent {string} includes changed file {string}", async function (patchIntentId: string, changedFile: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(patchIntentId);
  await assertSandboxWorkspaceText(changedFile);
});

Then("the workspace keeps signed provenance for {string}", async function (patchIntentId: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(`event-${patchIntentId}`);
});

Then("{word} can leave the workspace without losing context", async function (contributorName: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText("saved as signed workspace snapshot");
  await assertSandboxWorkspaceText("project norms and prior terminal history");
});

Given(
  "a GitHub open-source contributor named {string} has an interrupted sandbox workspace {string} for repository {string}",
  function (contributorName: string, workspaceId: string, repositorySlug: string) {
    createCommunitySandboxWorkspaceProject(repositorySlug, "Contributor workspace", { contributorName });
    assert.ok(sandboxWorkspaceState.template);
    sandboxWorkspaceState.session = {
      id: workspaceId,
      templateId: sandboxWorkspaceState.template.id,
      repositorySlug,
      developer: contributorName,
      goal: "Add regional revenue chart",
      state: "interrupted",
      changedFiles: ["src/dashboard/RegionRevenue.tsx"],
      checks: [],
      agentContext: "project norms and prior terminal history",
      recoveryState: "saved as signed workspace snapshot",
      actions: ["Resume Workspace"],
    };
  },
);

When("{word} returns to the repository workspace list", function (contributorName: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.session);
});

When("{word} resumes the sandbox workspace", function (contributorName: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  assert.ok(sandboxWorkspaceState.session);
  sandboxWorkspaceState.session = {
    ...sandboxWorkspaceState.session,
    state: "running",
    recoveryState: "resumed from signed workspace snapshot",
    actions: ["Open Workspace", "Run Checks", "Submit Patch Intent"],
  };
});

Then("sandbox workspace {string} is ready to continue", async function (workspaceId: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(workspaceId);
  await assertSandboxWorkspaceText("running");
});

Then("the workspace still has agent context {string}", async function (agentContext: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(agentContext);
});

Then("the workspace explains recovery state {string}", async function (recoveryState: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(recoveryState);
});

Then("{word} can continue with workspace action {string}", async function (contributorName: string, action: string) {
  assert.equal(contributorName, sandboxWorkspaceState.contributorName);
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(action);
});

Given("maintainer {string} has a submitted sandbox workspace {string} with patch intent {string}", function (
  maintainerName: string,
  workspaceId: string,
  patchIntentId: string,
) {
  createCommunitySandboxWorkspaceProject("epoch-community", "Contributor workspace", {
    contributorName: "Alex",
    maintainerName,
  });
  assert.ok(sandboxWorkspaceState.template);
  sandboxWorkspaceState.session = {
    id: workspaceId,
    templateId: sandboxWorkspaceState.template.id,
    repositorySlug: "epoch-community",
    developer: "Alex",
    goal: "Add regional revenue chart",
    state: "submitted",
    changedFiles: ["src/dashboard/RegionRevenue.tsx"],
    checks: ["typecheck passed", "unit tests passed"],
    agentContext: "project norms and prior terminal history",
    recoveryState: "saved as signed workspace snapshot",
    patchIntentId,
    signedEventId: `event-${patchIntentId}`,
    actions: ["Open Workspace"],
  };
  sandboxWorkspaceState.review = {
    id: "review-region-revenue",
    workspaceId,
    maintainer: maintainerName.toLowerCase(),
    patchIntentId,
    changedFiles: [],
    checks: [],
    previewId: "preview-region-revenue",
    decision: "pending",
    signedEventId: "event-review-pending",
    actions: ["Open Preview", "Approve Patch", "Reject Patch"],
  };
});

When("{word} opens the workspace review queue", function (maintainerName: string) {
  assert.equal(maintainerName, sandboxWorkspaceState.maintainerName);
  assert.ok(sandboxWorkspaceState.review);
});

When("{word} reviews changed file {string}", function (maintainerName: string, changedFile: string) {
  assert.equal(maintainerName, sandboxWorkspaceState.maintainerName);
  assert.ok(sandboxWorkspaceState.review);
  sandboxWorkspaceState.review = {
    ...sandboxWorkspaceState.review,
    changedFiles: [...sandboxWorkspaceState.review.changedFiles, changedFile],
  };
});

When("{word} reviews passing checks for the workspace", function (maintainerName: string) {
  assert.equal(maintainerName, sandboxWorkspaceState.maintainerName);
  assert.ok(sandboxWorkspaceState.review);
  sandboxWorkspaceState.review = {
    ...sandboxWorkspaceState.review,
    checks: ["typecheck passed", "unit tests passed"],
  };
});

When("{word} approves the patch intent", function (maintainerName: string) {
  assert.equal(maintainerName, sandboxWorkspaceState.maintainerName);
  assert.ok(sandboxWorkspaceState.review);
  sandboxWorkspaceState.review = {
    ...sandboxWorkspaceState.review,
    decision: "approved",
    signedEventId: "event-review-region-revenue",
    actions: ["Open Preview"],
  };
});

Then("patch intent {string} is approved by {string}", async function (patchIntentId: string, maintainer: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(patchIntentId);
  await assertSandboxWorkspaceText("approved");
  await assertSandboxWorkspaceText(maintainer);
});

Then("the review includes preview {string}", async function (previewId: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(previewId);
});

Then("the review keeps signed provenance {string}", async function (signedEventId: string) {
  await renderSandboxWorkspaceApp();
  await assertSandboxWorkspaceText(signedEventId);
});

function createCommunitySandboxWorkspaceProject(
  repositorySlug: string,
  templateName: string,
  people: {
    readonly contributorName?: string;
    readonly maintainerName?: string;
  } = {},
): void {
  const sdk = new EpochPlatformSdk(createInMemoryPlatformCore({ communityEnabled: true }));
  const organization = sdk.organizations.create({ slug: "epoch", displayName: "Epoch" });
  const project = sdk.projects.create({
    organizationId: organization.id,
    slug: "community",
    displayName: "Epoch Community",
  });
  sdk.repositories.create({
    projectId: project.id,
    slug: repositorySlug,
    visibility: "public",
  });
  sandboxWorkspaceState = {
    sdk,
    projectId: project.id,
    repositorySlug,
    contributorName: people.contributorName,
    maintainerName: people.maintainerName,
    template: {
      id: "template-contributor",
      name: templateName,
      repositorySlug,
      startingContext: "main",
      setupSummary: "Ready-to-code project workspace",
      costOwner: "community compute pool",
      securityPolicy: "no repository secrets",
    },
  };
}

async function renderSandboxWorkspaceApp(): Promise<void> {
  assert.ok(sandboxWorkspaceState.sdk);
  assert.ok(sandboxWorkspaceState.projectId);
  assert.ok(sandboxWorkspaceState.template);
  const app = await createCommunityOperationsWebApp({
    platform: sandboxWorkspaceState.sdk,
    projectId: sandboxWorkspaceState.projectId,
    workspaceTemplates: [sandboxWorkspaceState.template],
    sandboxWorkspaces: sandboxWorkspaceState.session === undefined ? [] : [sandboxWorkspaceState.session],
    workspaceReviews: sandboxWorkspaceState.review === undefined ? [] : [sandboxWorkspaceState.review],
  });

  if (sandboxWorkspaceState.browser === undefined) {
    sandboxWorkspaceState.browser = await chromium.launch();
    sandboxWorkspaceState.page = await sandboxWorkspaceState.browser.newPage();
  }
  assert.ok(sandboxWorkspaceState.page);
  await sandboxWorkspaceState.page.setContent(renderCommunityOperationsDocument(app));
}

async function assertSandboxWorkspaceText(expected: string): Promise<void> {
  assert.ok(sandboxWorkspaceState.page);
  const text = await sandboxWorkspaceState.page.locator("body").innerText();
  assert.match(text, new RegExp(escapeForRegExp(expected), "u"));
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
