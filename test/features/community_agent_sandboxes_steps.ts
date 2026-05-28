import assert from "node:assert/strict";
import { After, Given, Then, When } from "@cucumber/cucumber";
import { chromium, type Browser, type Page } from "playwright";
import {
  createCommunityOperationsWebApp,
  renderCommunityOperationsDocument,
  type CommunityAgentSandboxRun,
  type CommunitySandboxWorkspaceReview,
} from "@epoch/community-operations-web";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";

interface CommunityAgentSandboxWorld {
  sdk?: EpochPlatformSdk;
  projectId?: string;
  repositorySlug?: string;
  maintainerName?: string;
  inputIntentId?: string;
  selectedAgent?: string;
  policySummary?: string;
  resourceLimits?: string;
  sandboxRuns: CommunityAgentSandboxRun[];
  workspaceReview?: CommunitySandboxWorkspaceReview;
  browser?: Browser;
  page?: Page;
}

let agentSandboxState: CommunityAgentSandboxWorld = {
  sandboxRuns: [],
};

After(async function () {
  await Promise.allSettled([
    agentSandboxState.page?.close(),
    agentSandboxState.browser?.close(),
  ]);
  agentSandboxState = {
    sandboxRuns: [],
  };
});

Given(
  "maintainer {string} has repository {string} with patch intent {string} ready for agent help",
  function (maintainerName: string, repositorySlug: string, inputIntentId: string) {
    createAgentSandboxProject(maintainerName, repositorySlug, inputIntentId);
  },
);

When("{word} opens the agent task queue for {string}", function (maintainerName: string, repositorySlug: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  assert.equal(repositorySlug, agentSandboxState.repositorySlug);
  assert.ok(agentSandboxState.inputIntentId);
});

When("{word} chooses agent {string} for intent {string}", function (maintainerName: string, agent: string, inputIntentId: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  assert.equal(inputIntentId, agentSandboxState.inputIntentId);
  agentSandboxState.selectedAgent = agent;
});

When(
  "{word} reviews sandbox policy {string} and limits {string}",
  function (maintainerName: string, policySummary: string, resourceLimits: string) {
    assert.equal(maintainerName, agentSandboxState.maintainerName);
    agentSandboxState.policySummary = policySummary;
    agentSandboxState.resourceLimits = resourceLimits;
  },
);

When("{word} starts the agent sandbox", function (maintainerName: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  assert.ok(agentSandboxState.sdk);
  assert.ok(agentSandboxState.projectId);
  assert.ok(agentSandboxState.repositorySlug);
  assert.ok(agentSandboxState.inputIntentId);
  assert.ok(agentSandboxState.selectedAgent);
  assert.ok(agentSandboxState.policySummary);
  assert.ok(agentSandboxState.resourceLimits);

  const aiPlan = agentSandboxState.sdk.ai.createActionPlan({
    projectId: agentSandboxState.projectId,
    action: `Run ${agentSandboxState.selectedAgent} for ${agentSandboxState.inputIntentId}`,
  });
  agentSandboxState.sdk.ai.approveActionPlan(aiPlan.id, { actor: maintainerName.toLowerCase() });

  agentSandboxState.sandboxRuns = [{
    id: "sandbox-region-revenue",
    aiPlanId: aiPlan.id,
    agent: agentSandboxState.selectedAgent,
    provider: "community-agent-pool",
    model: "project-approved-agent",
    policy: "maintainer-approved",
    state: "running",
    repositorySlug: agentSandboxState.repositorySlug,
    inputIntentId: agentSandboxState.inputIntentId,
    signedEventId: "event-sandbox-region-revenue",
    policySummary: agentSandboxState.policySummary,
    resourceLimits: agentSandboxState.resourceLimits,
    agentContext: "intent summary and repository norms",
    actions: ["Cancel Sandbox", "Open Sandbox Result"],
  }];
});

Then("agent sandbox {string} is running for intent {string}", async function (sandboxId: string, inputIntentId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(sandboxId);
  await assertAgentSandboxText("running");
  await assertAgentSandboxText(inputIntentId);
});

Then("the sandbox uses approved agent {string}", async function (agent: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(agent);
});

Then("the sandbox shows policy {string}", async function (policySummary: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(policySummary);
});

Then("the sandbox keeps signed invocation {string}", async function (signedEventId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(signedEventId);
});

Given(
  "maintainer {string} has completed agent sandbox {string} for intent {string}",
  function (maintainerName: string, sandboxId: string, inputIntentId: string) {
    createAgentSandboxProject(maintainerName, "epoch-community", inputIntentId);
    const aiPlan = createApprovedAiPlan(`Complete ui-agent for ${inputIntentId}`);
    agentSandboxState.sdk?.ai.executeActionPlan(aiPlan.id);
    agentSandboxState.sandboxRuns = [{
      id: sandboxId,
      aiPlanId: aiPlan.id,
      agent: "ui-agent",
      provider: "community-agent-pool",
      model: "project-approved-agent",
      policy: "maintainer-approved",
      state: "succeeded",
      repositorySlug: "epoch-community",
      inputIntentId,
      outputPatchId: "patch-region-revenue-agent",
      signedEventId: "event-agent-output-region-revenue",
      policySummary: "repo write only, no secrets, network allowlist docs",
      resourceLimits: "2 CPU / 4GB / 30m",
      transcriptSummary: "updated chart component and tests",
      changedFiles: [],
      checks: [],
      previewId: "preview-region-revenue",
      actions: ["Open Agent Transcript", "Submit Sandbox Patch", "Open Preview"],
    }];
  },
);

When("{word} opens the agent sandbox result", function (maintainerName: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  assert.equal(agentSandboxState.sandboxRuns.length, 1);
});

When("{word} reviews agent transcript {string}", function (maintainerName: string, transcriptSummary: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  updateLatestSandbox({ transcriptSummary });
});

When("{word} reviews sandbox changed file {string}", function (maintainerName: string, changedFile: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  const latest = latestSandbox();
  updateLatestSandbox({ changedFiles: [...(latest.changedFiles ?? []), changedFile] });
});

When("{word} reviews sandbox checks {string}", function (maintainerName: string, checks: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  updateLatestSandbox({ checks: commaSeparated(checks) });
});

When("{word} submits sandbox output as patch intent {string}", function (maintainerName: string, patchIntentId: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  const latest = latestSandbox();
  updateLatestSandbox({
    outputPatchId: patchIntentId,
    actions: ["Open Agent Transcript", "Open Preview"],
  });
  agentSandboxState.workspaceReview = {
    id: "review-agent-region-revenue",
    workspaceId: latest.id,
    maintainer: maintainerName.toLowerCase(),
    patchIntentId,
    changedFiles: latest.changedFiles ?? [],
    checks: latest.checks ?? [],
    previewId: latest.previewId,
    decision: "pending",
    signedEventId: latest.signedEventId,
    actions: ["Open Preview", "Approve Patch", "Reject Patch"],
  };
});

Then("patch intent {string} is ready for workspace review", async function (patchIntentId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(patchIntentId);
  await assertAgentSandboxText("pending");
});

Then("the sandbox result links preview {string}", async function (previewId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(previewId);
});

Then("the sandbox result keeps signed output {string}", async function (signedEventId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(signedEventId);
});

Given(
  "maintainer {string} has failed agent sandbox {string} for intent {string}",
  function (maintainerName: string, sandboxId: string, inputIntentId: string) {
    createAgentSandboxProject(maintainerName, "epoch-community", inputIntentId);
    const aiPlan = createApprovedAiPlan(`Try ui-agent for ${inputIntentId}`);
    agentSandboxState.sandboxRuns = [{
      id: sandboxId,
      aiPlanId: aiPlan.id,
      agent: "ui-agent",
      provider: "community-agent-pool",
      model: "project-approved-agent",
      policy: "maintainer-approved",
      state: "failed",
      repositorySlug: "epoch-community",
      inputIntentId,
      signedEventId: "event-agent-failure-region-revenue",
      policySummary: "repo write only, no repository secrets",
      resourceLimits: "2 CPU / 4GB / 30m",
      failureReason: "network allowlist blocked dependency install",
      agentContext: "intent summary and previous failure reason",
      actions: ["Open Sandbox Result", "Retry Sandbox"],
    }];
  },
);

When("{word} opens the failed sandbox diagnosis", function (maintainerName: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  assert.equal(latestSandbox().state, "failed");
});

When("{word} keeps secret policy {string}", function (maintainerName: string, secretPolicy: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  const latest = latestSandbox();
  updateLatestSandbox({
    policySummary: `${latest.policySummary}; ${secretPolicy}`,
  });
});

When("{word} retries the sandbox with agent {string}", function (maintainerName: string, agent: string) {
  assert.equal(maintainerName, agentSandboxState.maintainerName);
  assert.ok(agentSandboxState.inputIntentId);
  const failedRun = latestSandbox();
  const retryPlan = createApprovedAiPlan(`Retry ${agent} for ${agentSandboxState.inputIntentId}`);
  agentSandboxState.sandboxRuns = [
    ...agentSandboxState.sandboxRuns,
    {
      id: "sandbox-region-revenue-retry",
      aiPlanId: retryPlan.id,
      agent,
      provider: "community-agent-pool",
      model: "project-approved-agent",
      policy: "maintainer-approved",
      state: "queued",
      repositorySlug: failedRun.repositorySlug,
      inputIntentId: agentSandboxState.inputIntentId,
      signedEventId: "event-agent-retry-region-revenue",
      policySummary: failedRun.policySummary,
      resourceLimits: failedRun.resourceLimits,
      previousRunId: failedRun.id,
      agentContext: "intent summary and previous failure reason",
      actions: ["Cancel Sandbox"],
    },
  ];
});

Then("failed sandbox {string} keeps signed failure {string}", async function (sandboxId: string, signedEventId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(sandboxId);
  await assertAgentSandboxText(signedEventId);
});

Then("retry sandbox {string} is queued for intent {string}", async function (sandboxId: string, inputIntentId: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(sandboxId);
  await assertAgentSandboxText("queued");
  await assertAgentSandboxText(inputIntentId);
});

Then("the retry keeps agent context {string}", async function (agentContext: string) {
  await renderAgentSandboxApp();
  await assertAgentSandboxText(agentContext);
});

function createAgentSandboxProject(maintainerName: string, repositorySlug: string, inputIntentId: string): void {
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
  agentSandboxState = {
    sdk,
    projectId: project.id,
    repositorySlug,
    maintainerName,
    inputIntentId,
    sandboxRuns: [],
  };
}

function createApprovedAiPlan(action: string): { id: string } {
  assert.ok(agentSandboxState.sdk);
  assert.ok(agentSandboxState.projectId);
  assert.ok(agentSandboxState.maintainerName);
  const aiPlan = agentSandboxState.sdk.ai.createActionPlan({
    projectId: agentSandboxState.projectId,
    action,
  });
  agentSandboxState.sdk.ai.approveActionPlan(aiPlan.id, {
    actor: agentSandboxState.maintainerName.toLowerCase(),
  });
  return aiPlan;
}

async function renderAgentSandboxApp(): Promise<void> {
  assert.ok(agentSandboxState.sdk);
  assert.ok(agentSandboxState.projectId);
  const app = await createCommunityOperationsWebApp({
    platform: agentSandboxState.sdk,
    projectId: agentSandboxState.projectId,
    sandboxRuns: agentSandboxState.sandboxRuns,
    workspaceReviews: agentSandboxState.workspaceReview === undefined ? [] : [agentSandboxState.workspaceReview],
  });

  if (agentSandboxState.browser === undefined) {
    agentSandboxState.browser = await chromium.launch();
    agentSandboxState.page = await agentSandboxState.browser.newPage();
  }
  assert.ok(agentSandboxState.page);
  await agentSandboxState.page.setContent(renderCommunityOperationsDocument(app));
}

async function assertAgentSandboxText(expected: string): Promise<void> {
  assert.ok(agentSandboxState.page);
  const text = await agentSandboxState.page.locator("body").innerText();
  assert.match(text, new RegExp(escapeForRegExp(expected), "u"));
}

function latestSandbox(): CommunityAgentSandboxRun {
  const latest = agentSandboxState.sandboxRuns.at(-1);
  assert.ok(latest);
  return latest;
}

function updateLatestSandbox(patch: Partial<CommunityAgentSandboxRun>): void {
  const latest = latestSandbox();
  agentSandboxState.sandboxRuns = [
    ...agentSandboxState.sandboxRuns.slice(0, -1),
    {
      ...latest,
      ...patch,
    },
  ];
}

function commaSeparated(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
