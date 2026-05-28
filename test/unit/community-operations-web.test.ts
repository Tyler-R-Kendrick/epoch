import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createInMemoryPlatformCore } from "@epoch/platform-core";
import { EpochPlatformSdk } from "@epoch/platform-sdk";
import { createPlatformWebApp } from "@epoch/platform-web";
import {
  createCommunityOperationsWebApp,
  renderCommunityOperationsDocument,
} from "@epoch/community-operations-web";

export async function runCommunityOperationsWebTests(): Promise<void> {
  await operationsExtensionProjectsPlatformStateIntoCommunityHostingModel();
  await platformWebCanRegisterOperationsWithoutOwningIt();
  platformPackagesDoNotImportCommunityOperations();
}

async function operationsExtensionProjectsPlatformStateIntoCommunityHostingModel(): Promise<void> {
  const { sdk, projectId, deployJobId, aiPlanId } = createOperationsFixture();
  const app = await createCommunityOperationsWebApp({
    platform: sdk,
    projectId,
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
      jobId: deployJobId,
      state: "succeeded",
      signedEventId: "event-workflow-ci",
    }],
    sandboxRuns: [{
      id: "sandbox-region-widget",
      aiPlanId,
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

  assert.equal(app.project, "Epoch.Community.Operations.Web");
  assert.equal(app.product, "epoch-community-operations");
  assert.equal(app.deploymentTarget.id, "epoch-community-operations");
  assert.equal(app.hostedApps[0].name, "dashboard-web");
  assert.equal(app.hostedApps[0].latestDeploymentState, "succeeded");
  assert.equal(app.hostedApps[0].environmentName, "preview");
  assert.ok(app.hostedApps[0].actions.includes("Promote"));
  assert.ok(app.hostedApps[0].actions.includes("Rollback"));
  assert.equal(app.workflowAutomations[0].source, "github-actions");
  assert.equal(app.workflowRuns[0].jobId, deployJobId);
  assert.equal(app.agentSandboxes[0].aiPlanId, aiPlanId);
  assert.equal(app.runnerSummary.onlineRunners, 1);
  assert.ok(app.activity.some((event) => event.type === "deployment.executed"));

  const html = renderCommunityOperationsDocument(app);
  assert.match(html, /Community Operations/u);
  assert.match(html, /dashboard-web/u);
  assert.match(html, /Latest deploy: succeeded/u);
  assert.match(html, /GitHub Actions CI/u);
  assert.match(html, /ui-agent/u);
  assert.match(html, /event-agent-sandbox/u);
  assert.match(html, /signed provenance/u);
  assert.match(html, />Promote</u);
  assert.match(html, />Rollback</u);
  assert.match(html, /runner-a/u);
}

async function platformWebCanRegisterOperationsWithoutOwningIt(): Promise<void> {
  const app = await createCommunityOperationsWebApp({
    platform: new EpochPlatformSdk(createInMemoryPlatformCore()),
    projectId: "missing-project",
  });
  const web = createPlatformWebApp({ deployableApps: [app.deploymentTarget] });

  assert.ok(web.managedServices.some((service) => service.id === "epoch-community-operations"));
  assert.deepEqual(web.communityWorkflows, []);
}

function platformPackagesDoNotImportCommunityOperations(): void {
  const repoRoot = process.cwd();
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Platform.Web"), "@epoch/community-operations-web");
  assertPackageDoesNotContain(join(repoRoot, "packages", "Epoch.Platform.Core"), "@epoch/community-operations-web");
}

function createOperationsFixture(): { sdk: EpochPlatformSdk; projectId: string; deployJobId: string; aiPlanId: string } {
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
  sdk.secrets.create({ environmentId: environment.id, name: "GITHUB_TOKEN", value: "secret-token" });
  const plan = sdk.deployments.createPlan({ deployableId: deployable.id, environmentId: environment.id });
  const deployment = sdk.deployments.executePlan(plan.id);
  const deployJob = sdk.jobs.get(deployment.jobId);
  const workflowJob = sdk.jobs.schedule({
    name: "github-actions-ci",
    type: "github-actions",
    idempotencyKey: "github-actions-ci-1",
  });
  const aiPlan = sdk.ai.createActionPlan({ projectId: project.id, action: "agent sandbox: draft dashboard widget" });
  sdk.ai.approveActionPlan(aiPlan.id, { actor: "maya" });
  sdk.ai.executeActionPlan(aiPlan.id);
  sdk.ai.recordEvaluation({ name: "sandbox-policy", score: 100 });

  assert.equal(deployJob.state, "succeeded");
  return { sdk, projectId: project.id, deployJobId: workflowJob.id, aiPlanId: aiPlan.id };
}

function assertPackageDoesNotContain(packageRoot: string, forbiddenImport: string): void {
  for (const filePath of files(packageRoot)) {
    const contents = readFileSync(filePath, "utf8");
    assert.equal(
      contents.includes(forbiddenImport),
      false,
      `${filePath} must not import ${forbiddenImport}`,
    );
  }
}

function files(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      result.push(...files(absolute));
    } else {
      result.push(absolute);
    }
  }
  return result;
}
