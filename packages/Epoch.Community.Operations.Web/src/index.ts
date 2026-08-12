import { epochTokensCss } from "@epoch/design-tokens";
import type {
  AiActionPlan,
  AuditEvent,
  DeployPlan,
  Deployment,
  Environment,
  PlatformEvent,
  PlatformSnapshot,
  Repository,
  Runner,
} from "@epoch/platform-core";
import type { EpochPlatformSdk } from "@epoch/platform-sdk";
import type { DeployableEpochApp, PwaAppDescriptor } from "@epoch/platform-web";

export type CommunityWorkflowAutomationSource = "github-actions" | "epoch-workflow";
export type CommunityOperationsRunState = "queued" | "running" | "scheduled" | "reconciled" | "succeeded" | "failed" | "canceled";
export type CommunityOperationsAction =
  | "Create Preview"
  | "Open Logs"
  | "Promote"
  | "Rollback"
  | "Re-run Workflow"
  | "Open Sandbox Result"
  | "Open Workspace"
  | "Resume Workspace"
  | "Run Checks"
  | "Submit Patch Intent"
  | "Open Preview"
  | "Approve Patch"
  | "Reject Patch"
  | "Start Agent Sandbox"
  | "Open Agent Transcript"
  | "Submit Sandbox Patch"
  | "Retry Sandbox"
  | "Cancel Sandbox";
export type CommunitySandboxWorkspaceState = "running" | "interrupted" | "checks-passed" | "submitted";
export type CommunitySandboxWorkspaceReviewDecision = "pending" | "approved" | "rejected";
export type CommunityAgentSandboxState = AiActionPlan["state"] | "queued" | "running" | "succeeded" | "failed";

export interface CommunityConvergenceOperations {
  readonly promisor: {
    readonly health: "healthy" | "degraded" | "unavailable";
    readonly missingPromised: number;
    readonly integrity: "verified" | "failed";
  };
  readonly workspace: {
    readonly provider: string;
    readonly copyMode: "copy-on-write" | "full-copy" | "reflink";
    readonly executionIsolation: "none" | "sandboxed" | "vm";
  };
  readonly mirror: {
    readonly state: "current" | "lagging" | "quarantined";
    readonly lagSeconds: number;
    readonly drift: number;
    readonly checkpoint: string;
    readonly retryAction: string;
  };
  readonly forge: {
    readonly protocol: string;
    readonly fidelity: string;
    readonly transport: string;
  };
  readonly archive: {
    readonly swhid?: string;
    readonly status: "not-requested" | "pending" | "remote-confirmed" | "denied-private";
  };
  readonly identity: {
    readonly principal: string;
    readonly key: string;
    readonly sponsor: string;
    readonly grant: string;
    readonly budget: {
      readonly allocated: number;
      readonly reserved: number;
      readonly consumed: number;
      readonly released: number;
      readonly expired: number;
    };
  };
  readonly git: { readonly protocol: string; readonly objectFilter: string };
  readonly sync: { readonly bundle: string; readonly checkpoint: string; readonly quarantine: string };
  readonly objectResidency: string;
  readonly rejectedPush?: { readonly ref: string; readonly reason: string };
  readonly supportBundle: string;
  readonly mutationAuthorities: Readonly<Record<"merge" | "force" | "grant" | "budget" | "public-archive", string>>;
}

export interface CommunityWorkflowAutomation {
  readonly id: string;
  readonly name: string;
  readonly source: CommunityWorkflowAutomationSource;
  readonly workflowPath: string;
  readonly trigger: string;
  readonly executionAuthority?: string;
}

export interface CommunityWorkflowRun {
  readonly id: string;
  readonly automationId: string;
  readonly jobId?: string;
  readonly state: CommunityOperationsRunState;
  readonly signedEventId: string;
}

export interface CommunityAgentSandboxRuntime {
  readonly provider: string;
  readonly orchestrator: string;
  readonly adapter: string;
  readonly adapterPackage?: string;
  readonly gateway: string;
  readonly compute: string;
  readonly writableDirectory: string;
  readonly resourceLimits: string;
  readonly policyLayers: readonly string[];
}

export interface CommunityAgentSandboxRun {
  readonly id: string;
  readonly aiPlanId: string;
  readonly agent: string;
  readonly provider: string;
  readonly model: string;
  readonly policy: string;
  readonly state?: CommunityAgentSandboxState;
  readonly repositorySlug?: string;
  readonly inputIntentId: string;
  readonly outputPatchId?: string;
  readonly signedEventId: string;
  readonly policySummary?: string;
  readonly resourceLimits?: string;
  readonly transcriptSummary?: string;
  readonly agentContext?: string;
  readonly changedFiles?: readonly string[];
  readonly checks?: readonly string[];
  readonly previewId?: string;
  readonly failureReason?: string;
  readonly previousRunId?: string;
  readonly actions?: readonly CommunityOperationsAction[];
  readonly runtime?: CommunityAgentSandboxRuntime;
}

export interface CommunitySandboxWorkspaceTemplate {
  readonly id: string;
  readonly name: string;
  readonly repositorySlug: string;
  readonly startingContext: string;
  readonly setupSummary: string;
  readonly costOwner?: string;
  readonly securityPolicy?: string;
}

export interface CommunitySandboxWorkspaceSession {
  readonly id: string;
  readonly templateId: string;
  readonly repositorySlug: string;
  readonly developer: string;
  readonly goal: string;
  readonly state: CommunitySandboxWorkspaceState;
  readonly changedFiles: readonly string[];
  readonly checks: readonly string[];
  readonly agentContext: string;
  readonly recoveryState?: string;
  readonly patchIntentId?: string;
  readonly signedEventId?: string;
  readonly actions: readonly CommunityOperationsAction[];
}

export interface CommunitySandboxWorkspaceReview {
  readonly id: string;
  readonly workspaceId: string;
  readonly maintainer: string;
  readonly patchIntentId: string;
  readonly changedFiles: readonly string[];
  readonly checks: readonly string[];
  readonly previewId?: string;
  readonly decision: CommunitySandboxWorkspaceReviewDecision;
  readonly signedEventId: string;
  readonly actions: readonly CommunityOperationsAction[];
}

export interface CommunityHostedApp {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly runtime: string;
  readonly repositorySlug: string;
  readonly environmentName: string;
  readonly latestDeploymentState: Deployment["state"] | "not-deployed";
  readonly health: Deployment["health"] | "unknown";
  readonly runnerName: string;
  readonly secretCount: number;
  readonly operatorIdentity: string;
  readonly signedEventId: string;
  readonly actions: readonly CommunityOperationsAction[];
}

export interface CommunityRunnerSummary {
  readonly onlineRunners: number;
  readonly totalCapacity: number;
  readonly runners: readonly {
    readonly id: string;
    readonly name: string;
    readonly state: Runner["state"];
    readonly capacity: number;
  }[];
}

export interface CommunityOperationsActivity {
  readonly id: string;
  readonly type: string;
  readonly resourceId?: string;
  readonly actor?: string;
}

export interface CommunityOperationsDeploymentTarget extends DeployableEpochApp {
  readonly id: "epoch-community-operations";
  readonly kind: "community-operations-webapp";
  readonly displayName: "Epoch Community Operations";
}

export interface CommunityOperationsWebAppDefinition {
  readonly project: "Epoch.Community.Operations.Web";
  readonly product: "epoch-community-operations";
  readonly pwa: PwaAppDescriptor;
  readonly deploymentTarget: CommunityOperationsDeploymentTarget;
  readonly projectScope: {
    readonly id: string;
    readonly displayName: string;
  };
  readonly hostedApps: readonly CommunityHostedApp[];
  readonly workspaceTemplates: readonly CommunitySandboxWorkspaceTemplate[];
  readonly sandboxWorkspaces: readonly CommunitySandboxWorkspaceSession[];
  readonly workspaceReviews: readonly CommunitySandboxWorkspaceReview[];
  readonly workflowAutomations: readonly CommunityWorkflowAutomation[];
  readonly workflowRuns: readonly CommunityWorkflowRun[];
  readonly agentSandboxes: readonly CommunityAgentSandboxRun[];
  readonly runnerSummary: CommunityRunnerSummary;
  readonly activity: readonly CommunityOperationsActivity[];
  readonly moderationReports: readonly CommunityModerationReport[];
  readonly convergence?: CommunityConvergenceOperations;
}

/**
 * A moderation report as a moderator sees it: the signed record that a Report
 * action opened in the community, surfaced as a queue instead of leaving the
 * moderator to notice it scrolling past in #governance.
 */
export interface CommunityModerationReport {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly status: string;
  readonly repositorySlug: string;
  /** Community channel the report is recorded in. */
  readonly channel: string;
  /** True while the report still needs a moderator decision. */
  readonly open: boolean;
}

/** Repository shape needed to derive reports — matches CommunityRepository. */
interface ModerationSourceRepository {
  readonly slug: string;
  readonly issues: readonly {
    readonly id: string;
    readonly title: string;
    readonly author: string;
    readonly status: string;
    readonly labels?: readonly string[];
  }[];
}

/**
 * Derive the moderation queue from community issues. Report actions label
 * their records `moderation`, so the queue is real signed records, never a
 * separate store that could disagree with the community.
 */
export function moderationReportsFromRepositories(
  repositories: readonly ModerationSourceRepository[],
): readonly CommunityModerationReport[] {
  const reports: CommunityModerationReport[] = [];
  for (const repository of repositories) {
    for (const issue of repository.issues) {
      const labels = (issue.labels ?? []).map((label) => label.toLowerCase());
      if (!labels.includes("moderation")) continue;
      reports.push({
        id: issue.id,
        title: issue.title,
        author: issue.author,
        status: issue.status,
        repositorySlug: repository.slug,
        channel: "governance",
        open: issue.status.toLowerCase() !== "closed" && issue.status.toLowerCase() !== "resolved",
      });
    }
  }
  // Open reports first: the queue exists to show what still needs a decision.
  return reports.sort((left, right) => Number(right.open) - Number(left.open));
}

export interface CreateCommunityOperationsWebAppOptions {
  readonly platform: EpochPlatformSdk;
  readonly projectId: string;
  readonly basePath?: string;
  readonly version?: string;
  readonly image?: string;
  readonly workflowAutomations?: readonly CommunityWorkflowAutomation[];
  readonly workflowRuns?: readonly CommunityWorkflowRun[];
  readonly sandboxRuns?: readonly CommunityAgentSandboxRun[];
  readonly workspaceTemplates?: readonly CommunitySandboxWorkspaceTemplate[];
  readonly sandboxWorkspaces?: readonly CommunitySandboxWorkspaceSession[];
  readonly workspaceReviews?: readonly CommunitySandboxWorkspaceReview[];
  /** Community repositories whose moderation-labelled issues form the queue. */
  readonly communityRepositories?: readonly ModerationSourceRepository[];
  readonly convergence?: CommunityConvergenceOperations;
}

export async function createCommunityOperationsWebApp(
  options: CreateCommunityOperationsWebAppOptions,
): Promise<CommunityOperationsWebAppDefinition> {
  const snapshot = options.platform.snapshots.export();
  const project = snapshot.projects.find((candidate) => candidate.id === options.projectId);
  const projectId = project?.id ?? options.projectId;
  const basePath = normalizedBasePath(options.basePath ?? "/community/operations");

  return {
    project: "Epoch.Community.Operations.Web",
    product: "epoch-community-operations",
    pwa: {
      name: "Epoch Community Operations",
      shortName: "Epoch Ops",
      startUrl: basePath,
      display: "standalone",
      themeColor: "#070b12",
      backgroundColor: "#03050a",
      offlineShell: true,
    },
    deploymentTarget: createCommunityOperationsDeploymentTarget({
      basePath,
      version: options.version,
      image: options.image,
    }),
    projectScope: {
      id: projectId,
      displayName: project?.displayName ?? projectId,
    },
    hostedApps: project === undefined ? [] : hostedAppsForProject(snapshot, projectId),
    workspaceTemplates: [...(options.workspaceTemplates ?? [])],
    sandboxWorkspaces: [...(options.sandboxWorkspaces ?? [])],
    workspaceReviews: [...(options.workspaceReviews ?? [])],
    workflowAutomations: [...(options.workflowAutomations ?? [])],
    workflowRuns: workflowRunsWithPlatformJobs(snapshot, options.workflowRuns ?? []),
    agentSandboxes: sandboxRunsWithPlatformPlans(snapshot, options.sandboxRuns ?? []),
    runnerSummary: runnerSummary(snapshot.runners),
    activity: activityFromAudit(snapshot.auditEvents, snapshot.platformEvents),
    moderationReports: moderationReportsFromRepositories(options.communityRepositories ?? []),
    convergence: options.convergence,
  };
}

export function createCommunityOperationsDeploymentTarget(options: {
  readonly basePath?: string;
  readonly version?: string;
  readonly image?: string;
} = {}): CommunityOperationsDeploymentTarget {
  return {
    id: "epoch-community-operations",
    kind: "community-operations-webapp",
    displayName: "Epoch Community Operations",
    version: options.version ?? "0.1.0",
    image: options.image ?? "ghcr.io/epoch/community-operations-web:0.1.0",
    route: normalizedBasePath(options.basePath ?? "/community/operations"),
    healthPath: "/healthz",
    ports: [8081],
    environment: [
      "EPOCH_PLATFORM_API_URL",
      "EPOCH_COMMUNITY_OPERATIONS_BASE_URL",
      "EPOCH_SIGNING_KEY_REF",
    ],
    requiredServices: [
      "epoch-node",
      "epoch-object-store",
      "epoch-sync-seed",
      "epoch-community-api",
    ],
  };
}

export function renderCommunityOperationsDocument(app: CommunityOperationsWebAppDefinition): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(app.pwa.themeColor)}">
  <title>${escapeHtml(app.pwa.name)}</title>
  <style>
${communityOperationsStyles()}
  </style>
</head>
<body>
  <a class="skip-link" href="#operations-content">Skip to operations</a>
  <main id="epoch-community-operations" data-design-system="epoch-community-operations">
    <header class="ops-header">
      <div>
        <p class="eyebrow">signed provenance for community-hosted capabilities</p>
        <h1>${escapeHtml(app.pwa.name)}</h1>
        <p class="lede">${escapeHtml(app.projectScope.displayName)} sandbox workspaces, project operations, preview deploys, workflows, and agent sandboxes.</p>
      </div>
      <dl class="ops-summary" aria-label="Operations summary">
        <div><dt>Apps</dt><dd>${app.hostedApps.length}</dd></div>
        <div><dt>Workspaces</dt><dd>${app.sandboxWorkspaces.length}</dd></div>
        <div><dt>Workflows</dt><dd>${app.workflowRuns.length}</dd></div>
        <div><dt>Runners</dt><dd>${app.runnerSummary.onlineRunners}</dd></div>
      </dl>
    </header>
    <nav class="ops-tabs" aria-label="Community operations sections">
      ${app.convergence === undefined ? "" : `<a href="#convergence">Convergence</a>`}
      <a href="#moderation">Moderation</a>
      <a href="#apps">Apps</a>
      <a href="#workspaces">Sandbox Workspaces</a>
      <a href="#workspace-reviews">Workspace Reviews</a>
      <a href="#previews">Previews</a>
      <a href="#workflows">Workflows</a>
      <a href="#sandboxes">Agent Sandboxes</a>
      <a href="#runners">Runners</a>
      <a href="#activity">Activity</a>
    </nav>
    <section id="operations-content" class="ops-grid" aria-label="Community operations dashboard">
      ${app.convergence === undefined ? "" : `<section id="convergence" class="ops-section convergence-section" aria-labelledby="convergence-operations-title">${renderConvergenceOperationsPanel(app.convergence)}</section>`}
      <section id="moderation" class="ops-section" aria-labelledby="moderation-title" data-moderation-queue>
        <h2 id="moderation-title">Moderation${openModerationCount(app.moderationReports) === 0 ? "" : ` <span class="ops-queue-count" data-moderation-open>${openModerationCount(app.moderationReports)} open</span>`}</h2>
        ${app.moderationReports.length === 0
          ? emptyCard("No moderation reports", "Reports filed from a community message appear here as signed records awaiting a decision.")
          : app.moderationReports.map(renderModerationReport).join("")}
      </section>
      <section id="apps" class="ops-section" aria-labelledby="apps-title">
        <h2 id="apps-title">Apps</h2>
        ${app.hostedApps.length === 0 ? emptyCard("No hosted apps", "Connect Platform state to show deployable apps here.") : app.hostedApps.map(renderHostedApp).join("")}
      </section>
      <section id="workspaces" class="ops-section" aria-labelledby="workspaces-title">
        <h2 id="workspaces-title">Sandbox Workspaces</h2>
        ${app.sandboxWorkspaces.length === 0 ? emptyCard("No sandbox workspaces", "Launch a workspace from a repository to make a signed patch intent.") : app.sandboxWorkspaces.map((workspace) => renderSandboxWorkspace(workspace, app.workspaceTemplates)).join("")}
      </section>
      <section id="workspace-reviews" class="ops-section" aria-labelledby="workspace-reviews-title">
        <h2 id="workspace-reviews-title">Workspace Reviews</h2>
        ${app.workspaceReviews.length === 0 ? emptyCard("No workspace reviews", "Submitted workspace results appear here for maintainer review.") : app.workspaceReviews.map(renderWorkspaceReview).join("")}
      </section>
      <section id="previews" class="ops-section" aria-labelledby="previews-title">
        <h2 id="previews-title">Previews</h2>
        ${app.hostedApps.map(renderPreviewCard).join("") || emptyCard("No previews", "Create a preview deploy from an intent or change proposal.")}
      </section>
      <section id="workflows" class="ops-section" aria-labelledby="workflows-title">
        <h2 id="workflows-title">Workflows</h2>
        ${app.workflowAutomations.length === 0 ? emptyCard("No workflows", "Import GitHub Actions as portable Epoch workflow definitions.") : app.workflowAutomations.map((automation) => renderWorkflow(automation, app.workflowRuns)).join("")}
      </section>
      <section id="sandboxes" class="ops-section" aria-labelledby="sandboxes-title">
        <h2 id="sandboxes-title">Agent Sandboxes</h2>
        ${app.agentSandboxes.length === 0 ? emptyCard("No agent sandboxes", "Run an approved agent plan to create a signed sandbox result.") : app.agentSandboxes.map(renderSandbox).join("")}
      </section>
      <section id="runners" class="ops-section" aria-labelledby="runners-title">
        <h2 id="runners-title">Runners</h2>
        ${renderRunners(app.runnerSummary)}
      </section>
      <section id="activity" class="ops-section" aria-labelledby="activity-title">
        <h2 id="activity-title">Activity</h2>
        <p class="provenance-note">All operations keep signed provenance close to the deploy, workflow, or sandbox output.</p>
        ${app.activity.length === 0 ? emptyCard("No signed activity", "Platform audit and event records appear here.") : `<ol class="activity-list">${app.activity.slice(-8).map(renderActivity).join("")}</ol>`}
      </section>
    </section>
  </main>
</body>
</html>`;
}

export function renderConvergenceOperationsPanel(status: CommunityConvergenceOperations): string {
  const availability = status.promisor.missingPromised > 0
    ? `${status.promisor.missingPromised} promised objects are an availability gap`
    : "all promised objects are available";
  const integrity = status.promisor.integrity === "verified" ? "integrity verified" : "INTEGRITY FAILURE";
  const budget = status.identity.budget;
  const authorities = Object.entries(status.mutationAuthorities);
  return `<div class="convergence-operations" data-convergence-operations>
    <header>
      <p class="eyebrow">object availability · fidelity · authority</p>
      <h2 id="convergence-operations-title">Repository convergence</h2>
      <p class="provenance-note">${escapeHtml(availability)} · ${escapeHtml(integrity)}. Availability never masquerades as corruption.</p>
    </header>
    <div class="convergence-status-grid" role="list" aria-label="Repository convergence status">
      ${operationsStatus("Promisor health", status.promisor.health, `${availability}; ${integrity}`)}
      ${operationsStatus("Workspace provider", status.workspace.provider, `Actual copy mode: ${status.workspace.copyMode}; execution isolation: ${status.workspace.executionIsolation}`)}
      ${operationsStatus("Mirror lag", `${status.mirror.lagSeconds}s · ${status.mirror.state}`, `Drift: ${status.mirror.drift}; checkpoint ${status.mirror.checkpoint}; ${status.mirror.retryAction}`)}
      ${operationsStatus("Git protocol", status.git.protocol, `Partial clone filter: ${status.git.objectFilter}`)}
      ${operationsStatus("Sync bundle", status.sync.bundle, `Checkpoint: ${status.sync.checkpoint}; quarantine: ${status.sync.quarantine}`)}
      ${operationsStatus("Forge fidelity", status.forge.protocol, `${status.forge.fidelity}; transport: ${status.forge.transport}`)}
      ${operationsStatus("Object residency", status.objectResidency, "Hydration changes availability, never object identity or integrity.")}
      ${operationsStatus("SWHID", status.archive.swhid ?? "not assigned", `Archive status: ${status.archive.status}`)}
    </div>
    ${status.mirror.state === "quarantined" ? `<section class="ops-alert" role="alert"><h3>Mirror quarantined</h3><p>Recover from signed ${escapeHtml(status.mirror.checkpoint)} after inspection.</p><button type="button">${escapeHtml(status.mirror.retryAction)}</button></section>` : ""}
    ${status.rejectedPush === undefined ? "" : `<section class="ops-alert" role="status"><h3>Push rejected · ${escapeHtml(status.rejectedPush.ref)}</h3><p>${escapeHtml(status.rejectedPush.reason)}</p></section>`}
    <section aria-labelledby="identity-authority-title">
      <h3 id="identity-authority-title">Principal, sponsor, grant, and finite budget</h3>
      <dl class="ops-facts">
        <div><dt>Principal</dt><dd>${escapeHtml(status.identity.principal)}</dd></div>
        <div><dt>Key</dt><dd>${escapeHtml(status.identity.key)}</dd></div>
        <div><dt>Sponsor</dt><dd>${escapeHtml(status.identity.sponsor)}</dd></div>
        <div><dt>Grant</dt><dd>${escapeHtml(status.identity.grant)}</dd></div>
        <div><dt>Allocated</dt><dd>${budget.allocated}</dd></div>
        <div><dt>Reserved</dt><dd>${budget.reserved}</dd></div>
        <div><dt>Consumed</dt><dd>${budget.consumed}</dd></div>
        <div><dt>Released</dt><dd>${budget.released}</dd></div>
        <div><dt>Expired</dt><dd>${budget.expired}</dd></div>
      </dl>
    </section>
    <section aria-labelledby="mutation-authority-title">
      <h3 id="mutation-authority-title">Confirmed mutations</h3>
      <p class="provenance-note">These operations do not execute from this overview. Open the preview, inspect the authority explanation, then confirm.</p>
      <div class="actions">${authorities.map(([action, authority]) => `<button type="button" data-mutation="${escapeHtml(action)}" data-confirmation-required="true" data-authority="${escapeHtml(authority)}">${escapeHtml(action)} · requires ${escapeHtml(authority)} · confirm…</button>`).join("")}</div>
    </section>
  </div>`;
}

/**
 * Produces an allowlisted diagnostic bundle. `privateContext` is accepted at
 * the boundary to make the security property testable, but is intentionally
 * never traversed or serialized: raw sessions and credentials are not
 * diagnostic fields.
 */
export function createRedactedConvergenceSupportBundle(
  status: CommunityConvergenceOperations,
  _privateContext?: unknown,
): string {
  return JSON.stringify({
    schemaVersion: 1,
    promisor: status.promisor,
    workspace: status.workspace,
    mirror: status.mirror,
    forge: status.forge,
    archive: status.archive,
    git: status.git,
    sync: status.sync,
    objectResidency: status.objectResidency,
    identity: {
      principal: status.identity.principal,
      keyStatus: status.identity.key,
      sponsor: status.identity.sponsor,
      grantStatus: status.identity.grant,
      budget: status.identity.budget,
    },
    rejectedPush: status.rejectedPush,
    redacted: true,
  });
}

function operationsStatus(label: string, value: string, explanation: string): string {
  return `<article class="ops-card convergence-status" role="listitem"><h3>${escapeHtml(label)}</h3><p><strong>${escapeHtml(value)}</strong></p><p>${escapeHtml(explanation)}</p></article>`;
}

function hostedAppsForProject(snapshot: PlatformSnapshot, projectId: string): CommunityHostedApp[] {
  return snapshot.deployables
    .filter((deployable) => deployable.projectId === projectId)
    .map((deployable) => {
      const latestDeployment = latestDeploymentForDeployable(snapshot.deployments, deployable.id);
      const latestPlan = latestPlanForDeployable(snapshot.deployPlans, deployable.id);
      const environment = environmentFor(snapshot.environments, latestDeployment?.environmentId ?? latestPlan?.environmentId);
      const repository = repositoryFor(snapshot.repositories, deployable.source.repositoryId);
      const secretCount = environment === undefined ? 0 : snapshot.secretReferences.filter((secret) => secret.environmentId === environment.id).length;
      const signedEventId = auditForResource(snapshot.auditEvents, latestDeployment?.id ?? latestPlan?.id ?? deployable.id)?.id ?? deployable.id;

      return {
        id: deployable.id,
        name: deployable.name,
        kind: deployable.kind,
        runtime: deployable.runtime ?? "custom",
        repositorySlug: repository?.slug ?? deployable.source.repositoryId,
        environmentName: environment?.name ?? "unassigned",
        latestDeploymentState: latestDeployment?.state ?? "not-deployed",
        health: latestDeployment?.health ?? "unknown",
        runnerName: runnerNameForDeployment(snapshot, latestDeployment),
        secretCount,
        operatorIdentity: operatorIdentityFor(latestPlan),
        signedEventId,
        actions: ["Create Preview", "Open Logs", "Promote", "Rollback"],
      };
    });
}

function workflowRunsWithPlatformJobs(
  snapshot: PlatformSnapshot,
  runs: readonly CommunityWorkflowRun[],
): CommunityWorkflowRun[] {
  return runs.map((run) => {
    const job = run.jobId === undefined ? undefined : snapshot.platformJobs.find((candidate) => candidate.id === run.jobId);
    return {
      ...run,
      state: run.state ?? job?.state ?? "queued",
    };
  });
}

function sandboxRunsWithPlatformPlans(
  snapshot: PlatformSnapshot,
  runs: readonly CommunityAgentSandboxRun[],
): CommunityAgentSandboxRun[] {
  return runs.map((run) => {
    const plan = snapshot.aiPlans.find((candidate) => candidate.id === run.aiPlanId);
    return {
      ...run,
      state: run.state ?? plan?.state ?? "queued",
    };
  });
}

function runnerSummary(runners: readonly Runner[]): CommunityRunnerSummary {
  return {
    onlineRunners: runners.filter((runner) => runner.state === "online").length,
    totalCapacity: runners.reduce((sum, runner) => sum + runner.capacity, 0),
    runners: runners.map((runner) => ({
      id: runner.id,
      name: runner.name,
      state: runner.state,
      capacity: runner.capacity,
    })),
  };
}

function activityFromAudit(
  auditEvents: readonly AuditEvent[],
  platformEvents: readonly PlatformEvent[],
): CommunityOperationsActivity[] {
  const platformTypesById = new Map(platformEvents.map((event) => [event.id, event.type]));
  return auditEvents.map((event) => ({
    id: event.id,
    type: event.type || platformTypesById.get(event.id) || "platform.event",
    resourceId: event.resourceId,
    actor: event.actor,
  }));
}

function latestDeploymentForDeployable(deployments: readonly Deployment[], deployableId: string): Deployment | undefined {
  return deployments.filter((deployment) => deployment.deployableId === deployableId).at(-1);
}

function latestPlanForDeployable(deployPlans: readonly DeployPlan[], deployableId: string): DeployPlan | undefined {
  return deployPlans.filter((plan) => plan.deployableId === deployableId).at(-1);
}

function environmentFor(environments: readonly Environment[], environmentId: string | undefined): Environment | undefined {
  return environmentId === undefined ? undefined : environments.find((environment) => environment.id === environmentId);
}

function repositoryFor(repositories: readonly Repository[], repositoryId: string): Repository | undefined {
  return repositories.find((repository) => repository.id === repositoryId);
}

function auditForResource(auditEvents: readonly AuditEvent[], resourceId: string | undefined): AuditEvent | undefined {
  return resourceId === undefined ? undefined : auditEvents.find((event) => event.resourceId === resourceId);
}

function runnerNameForDeployment(snapshot: PlatformSnapshot, deployment: Deployment | undefined): string {
  if (deployment === undefined) {
    return snapshot.runners[0]?.name ?? "unassigned";
  }
  const job = snapshot.jobs.find((candidate) => candidate.id === deployment.jobId);
  const runner = job?.runnerId === null || job?.runnerId === undefined ? undefined : snapshot.runners.find((candidate) => candidate.id === job.runnerId);
  return runner?.name ?? snapshot.runners[0]?.name ?? "unassigned";
}

function operatorIdentityFor(plan: DeployPlan | undefined): string {
  return plan?.approvals.find((approval) => approval.approvedBy !== undefined)?.approvedBy ?? "community-maintainer";
}

function renderHostedApp(app: CommunityHostedApp): string {
  return `<article class="ops-card">
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(app.kind)} / ${escapeHtml(app.runtime)}</p>
        <h3>${escapeHtml(app.name)}</h3>
      </div>
      <span class="status">${escapeHtml(app.latestDeploymentState)}</span>
    </div>
    <p>${escapeHtml(app.repositorySlug)} to ${escapeHtml(app.environmentName)}</p>
    <dl class="card-facts">
      <div><dt>Runtime</dt><dd>${escapeHtml(app.runtime)}</dd></div>
      <div><dt>Health</dt><dd>${escapeHtml(app.health)}</dd></div>
      <div><dt>Runner</dt><dd>${escapeHtml(app.runnerName)}</dd></div>
      <div><dt>Secrets</dt><dd>${app.secretCount}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(app.signedEventId)}</dd></div>
    </dl>
    <p class="provenance-note">Latest deploy: ${escapeHtml(app.latestDeploymentState)} with signed provenance from ${escapeHtml(app.operatorIdentity)}.</p>
    <div class="actions">${app.actions.map((action) => renderAction(action)).join("")}</div>
  </article>`;
}

function renderPreviewCard(app: CommunityHostedApp): string {
  return `<article class="ops-card compact">
    <h3>${escapeHtml(app.name)} preview</h3>
    <p>${escapeHtml(app.environmentName)} deploys can be promoted or rolled back from signed review state.</p>
    <div class="actions">${["Create Preview", "Promote", "Rollback"].map((action) => renderAction(action as CommunityOperationsAction)).join("")}</div>
  </article>`;
}

function renderWorkflow(automation: CommunityWorkflowAutomation, runs: readonly CommunityWorkflowRun[]): string {
  const latestRun = runs.filter((run) => run.automationId === automation.id).at(-1);
  return `<article class="ops-card">
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(automation.source)}</p>
        <h3>${escapeHtml(automation.name)}</h3>
      </div>
      <span class="status">${escapeHtml(latestRun?.state ?? "not-run")}</span>
    </div>
    <p>${escapeHtml(automation.workflowPath)} on ${escapeHtml(automation.trigger)}</p>
    <dl class="card-facts">
      <div><dt>Source</dt><dd>${escapeHtml(automation.source)}</dd></div>
      <div><dt>Execution</dt><dd>${escapeHtml(automation.executionAuthority ?? "Epoch runner jobs")}</dd></div>
      <div><dt>Job</dt><dd>${escapeHtml(latestRun?.jobId ?? "not scheduled")}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(latestRun?.signedEventId ?? "pending")}</dd></div>
    </dl>
    <div class="actions">${renderAction("Re-run Workflow")}</div>
  </article>`;
}

function renderSandboxWorkspace(
  workspace: CommunitySandboxWorkspaceSession,
  templates: readonly CommunitySandboxWorkspaceTemplate[],
): string {
  const template = templates.find((candidate) => candidate.id === workspace.templateId);
  return `<article class="ops-card">
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(workspace.repositorySlug)}</p>
        <h3>${escapeHtml(workspace.goal)}</h3>
      </div>
      <span class="status">${escapeHtml(workspace.state)}</span>
    </div>
    <p>${escapeHtml(template?.name ?? "Workspace template")} from ${escapeHtml(template?.startingContext ?? "repository")} for ${escapeHtml(workspace.developer)}.</p>
    <dl class="card-facts">
      <div><dt>Workspace</dt><dd>${escapeHtml(workspace.id)}</dd></div>
      <div><dt>Cost owner</dt><dd>${escapeHtml(template?.costOwner ?? "not declared")}</dd></div>
      <div><dt>Security policy</dt><dd>${escapeHtml(template?.securityPolicy ?? "not declared")}</dd></div>
      <div><dt>Agent context</dt><dd>${escapeHtml(workspace.agentContext)}</dd></div>
      <div><dt>Recovery</dt><dd>${escapeHtml(workspace.recoveryState ?? "workspace state saved")}</dd></div>
      <div><dt>Patch intent</dt><dd>${escapeHtml(workspace.patchIntentId ?? "not submitted")}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(workspace.signedEventId ?? "pending")}</dd></div>
    </dl>
    ${renderTextList("Changed files", workspace.changedFiles)}
    ${renderTextList("Checks", workspace.checks)}
    <div class="actions">${workspace.actions.map((action) => renderAction(action)).join("")}</div>
  </article>`;
}

function renderWorkspaceReview(review: CommunitySandboxWorkspaceReview): string {
  return `<article class="ops-card">
    <div class="card-header">
      <div>
        <p class="eyebrow">workspace review</p>
        <h3>${escapeHtml(review.patchIntentId)}</h3>
      </div>
      <span class="status">${escapeHtml(review.decision)}</span>
    </div>
    <p>${escapeHtml(review.maintainer)} is reviewing ${escapeHtml(review.workspaceId)}.</p>
    <dl class="card-facts">
      <div><dt>Preview</dt><dd>${escapeHtml(review.previewId ?? "not created")}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(review.signedEventId)}</dd></div>
    </dl>
    ${renderTextList("Changed files", review.changedFiles)}
    ${renderTextList("Checks", review.checks)}
    <div class="actions">${review.actions.map((action) => renderAction(action)).join("")}</div>
  </article>`;
}

function renderSandbox(sandbox: CommunityAgentSandboxRun): string {
  const changedFiles = sandbox.changedFiles ?? [];
  const checks = sandbox.checks ?? [];
  const actions = sandbox.actions ?? ["Open Sandbox Result"];
  const runtimeFacts = sandbox.runtime === undefined
    ? ""
    : `<dl class="card-facts">
      <div><dt>Provider</dt><dd>${escapeHtml(sandbox.runtime.provider)}</dd></div>
      <div><dt>Orchestrator</dt><dd>${escapeHtml(sandbox.runtime.orchestrator)}</dd></div>
      <div><dt>Adapter</dt><dd>${escapeHtml(sandbox.runtime.adapter)}</dd></div>
      <div><dt>Gateway</dt><dd>${escapeHtml(sandbox.runtime.gateway)}</dd></div>
      <div><dt>Writable</dt><dd>${escapeHtml(sandbox.runtime.writableDirectory)}</dd></div>
      <div><dt>Limits</dt><dd>${escapeHtml(sandbox.runtime.resourceLimits)}</dd></div>
      <div><dt>Compute</dt><dd>${escapeHtml(sandbox.runtime.compute)}</dd></div>
      <div><dt>Adapter package</dt><dd>${escapeHtml(sandbox.runtime.adapterPackage ?? "configured by operator")}</dd></div>
    </dl>
    <ul class="policy-list">
      ${sandbox.runtime.policyLayers.map((policyLayer) => `<li>${escapeHtml(policyLayer)}</li>`).join("")}
    </ul>`;

  return `<article class="ops-card">
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(sandbox.repositorySlug ?? sandbox.provider)} / ${escapeHtml(sandbox.model)}</p>
        <h3>${escapeHtml(sandbox.agent)}</h3>
      </div>
      <span class="status">${escapeHtml(sandbox.state ?? "queued")}</span>
    </div>
    <p>Policy ${escapeHtml(sandbox.policySummary ?? sandbox.policy)} converts ${escapeHtml(sandbox.inputIntentId)} into ${escapeHtml(sandbox.outputPatchId ?? "a pending patch intent")}.</p>
    <dl class="card-facts">
      <div><dt>Sandbox</dt><dd>${escapeHtml(sandbox.id)}</dd></div>
      <div><dt>AI plan</dt><dd>${escapeHtml(sandbox.aiPlanId)}</dd></div>
      <div><dt>Input intent</dt><dd>${escapeHtml(sandbox.inputIntentId)}</dd></div>
      <div><dt>Output patch</dt><dd>${escapeHtml(sandbox.outputPatchId ?? "not created")}</dd></div>
      <div><dt>Limits</dt><dd>${escapeHtml(sandbox.resourceLimits ?? "operator default")}</dd></div>
      <div><dt>Agent context</dt><dd>${escapeHtml(sandbox.agentContext ?? "not recorded")}</dd></div>
      <div><dt>Preview</dt><dd>${escapeHtml(sandbox.previewId ?? "not created")}</dd></div>
      <div><dt>Previous run</dt><dd>${escapeHtml(sandbox.previousRunId ?? "none")}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(sandbox.signedEventId)}</dd></div>
    </dl>
    ${sandbox.transcriptSummary === undefined ? "" : `<p class="provenance-note">${escapeHtml(sandbox.transcriptSummary)}</p>`}
    ${sandbox.failureReason === undefined ? "" : `<p class="provenance-note">${escapeHtml(sandbox.failureReason)}</p>`}
    ${renderTextList("Changed files", changedFiles)}
    ${renderTextList("Checks", checks)}
    ${runtimeFacts}
    <div class="actions">${actions.map((action) => renderAction(action)).join("")}</div>
  </article>`;
}

function renderTextList(title: string, values: readonly string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `<div>
    <p class="list-title">${escapeHtml(title)}</p>
    <ul class="runner-list">
      ${values.map((value) => `<li><span>${escapeHtml(value)}</span></li>`).join("")}
    </ul>
  </div>`;
}

function renderRunners(summary: CommunityRunnerSummary): string {
  if (summary.runners.length === 0) {
    return emptyCard("No runners", "Register a runner before executing deploys, workflows, or sandboxes.");
  }

  return `<article class="ops-card">
    <p class="provenance-note">${summary.onlineRunners} online runners with ${summary.totalCapacity} total capacity.</p>
    <ul class="runner-list">
      ${summary.runners.map((runner) => `<li><span>${escapeHtml(runner.name)}</span><span>${escapeHtml(runner.state)} / ${runner.capacity}</span></li>`).join("")}
    </ul>
  </article>`;
}

function renderActivity(activity: CommunityOperationsActivity): string {
  return `<li>
    <span>${escapeHtml(activity.type)}</span>
    <code>${escapeHtml(activity.resourceId ?? activity.id)}</code>
  </li>`;
}

function openModerationCount(reports: readonly CommunityModerationReport[]): number {
  return reports.filter((report) => report.open).length;
}

function renderModerationReport(report: CommunityModerationReport): string {
  // State is text, not colour alone: moderators triage these at speed and some
  // read them with assistive tech.
  const state = report.open ? "open · needs a decision" : `${report.status} · closed`;
  return `<article class="ops-card" data-moderation-report="${escapeHtml(report.id)}" data-moderation-open="${report.open ? "true" : "false"}">
    <h3>${escapeHtml(report.title)}</h3>
    <p>${escapeHtml(state)}</p>
    <dl>
      <div><dt>Reported by</dt><dd>${escapeHtml(report.author)}</dd></div>
      <div><dt>Record</dt><dd><code>${escapeHtml(report.id)}</code></dd></div>
      <div><dt>Project</dt><dd>${escapeHtml(report.repositorySlug)}</dd></div>
    </dl>
    <p class="ops-card-actions"><a href="/community/c/${escapeHtml(report.channel)}">Open #${escapeHtml(report.channel)} in the community</a></p>
  </article>`;
}

function renderAction(action: CommunityOperationsAction): string {
  return `<a href="#${escapeHtml(action.toLowerCase().replaceAll(" ", "-"))}">${escapeHtml(action)}</a>`;
}

function emptyCard(title: string, body: string): string {
  return `<article class="ops-card empty">
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(body)}</p>
  </article>`;
}

function normalizedBasePath(path: string): string {
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  return prefixed.endsWith("/") && prefixed.length > 1 ? prefixed.slice(0, -1) : prefixed;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function communityOperationsStyles(): string {
  return `${epochTokensCss}

    /* The --ops-* alias layer is gone. Its values were correct but its names
       inverted the vocabulary — "accent" meant teal here and copper in
       Community Web — which guaranteed the two would drift. Ops consumes the
       shared tokens directly (ADR-0010). */
    :root {
      font-family: var(--epoch-font-ui);
      letter-spacing: 0;
      background: var(--epoch-color-surface);
    }

    * { box-sizing: border-box; }

    body {
      min-width: 320px;
      margin: 0;
      color: var(--epoch-color-ink);
      background: var(--epoch-color-surface);
    }

    a { color: inherit; }

    a:focus-visible {
      outline: 2px solid var(--epoch-color-control);
      outline-offset: 2px;
    }

    .skip-link {
      position: fixed;
      inset-block-start: 1rem;
      inset-inline-start: 1rem;
      z-index: 10;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      transform: translateY(-140%);
    }

    .skip-link:focus-visible { transform: translateY(0); }

    #epoch-community-operations { min-height: 100vh; }

    .ops-header,
    .ops-tabs,
    .ops-grid {
      width: min(1180px, calc(100% - 2rem));
      margin-inline: auto;
    }

    .ops-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 0.7fr);
      gap: 2rem;
      align-items: end;
      padding-block: 2rem 1.25rem;
    }

    .eyebrow {
      margin: 0 0 0.5rem;
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1, h2, h3, p { overflow-wrap: break-word; }

    h1 {
      /* App name in the first viewport: the DESIGN.md display level, nothing larger. */
      margin: 0;
      font-size: var(--epoch-type-display-size);
      font-weight: var(--epoch-type-display-weight);
      line-height: var(--epoch-type-display-leading);
      letter-spacing: var(--epoch-type-display-tracking);
    }

    h2 {
      margin: 0;
      font-size: var(--epoch-type-headline-size);
    }

    h3 {
      margin: 0;
      font-size: 1rem;
    }

    .lede {
      max-width: 62ch;
      margin: 1rem 0 0;
      color: var(--epoch-color-muted);
      line-height: 1.6;
    }

    .ops-summary,
    .card-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
      margin: 0;
    }

    .ops-summary div,
    .card-facts div {
      min-width: 0;
      padding: 0.8rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
    }

    dt {
      color: var(--epoch-color-muted);
      font-size: 0.75rem;
      font-weight: 750;
    }

    dd {
      margin: 0.18rem 0 0;
      font-weight: 800;
    }

    .ops-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-block: 0.5rem 1rem;
    }

    .ops-tabs a,
    .actions a {
      display: inline-flex;
      min-height: 2.25rem;
      align-items: center;
      justify-content: center;
      padding: 0.58rem 0.75rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      font-weight: 750;
      text-decoration: none;
      white-space: nowrap;
    }

    .actions a:first-child {
      border-color: var(--epoch-color-ink);
      background: var(--epoch-color-ink);
      color: var(--epoch-color-surface-raised);
    }

    .actions button,
    .ops-alert button {
      min-height: 44px;
      padding: 0.58rem 0.75rem;
      border: 1px solid var(--epoch-color-control);
      border-radius: var(--epoch-radius-sm);
      color: var(--epoch-color-ink);
      background: var(--epoch-color-surface-raised);
      font: inherit;
      text-align: start;
    }

    .actions button:focus-visible,
    .ops-alert button:focus-visible {
      outline: 2px solid var(--epoch-color-control);
      outline-offset: 2px;
    }

    .convergence-section { grid-column: 1 / -1; }

    .convergence-status-grid,
    .ops-facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
      gap: var(--epoch-space-sm);
    }

    .ops-facts { margin: 0; }

    .ops-facts div,
    .ops-alert {
      padding: var(--epoch-space-sm);
      border: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
    }

    .ops-alert { border-color: var(--epoch-color-danger); }

    .ops-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      padding-block-end: 2rem;
    }

    .ops-section {
      display: grid;
      align-content: start;
      gap: 0.75rem;
      min-width: 0;
    }

    .ops-card {
      display: grid;
      gap: 0.85rem;
      min-width: 0;
      padding: 1rem;
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      box-shadow: 0 1px 0 color-mix(in srgb, var(--epoch-color-ink) 5%, transparent);
    }
    /* Moderation queue: an open report is a control you have to run to, marked
       by the same circle idiom the community rail uses. Out-of-bounds ink, not
       the reserved course ink — moderation is not the promote path. */
    .ops-card[data-moderation-open="true"] {
      position: relative;
      padding-inline-start: 1.6rem;
    }
    .ops-card[data-moderation-open="true"]::before {
      content: "";
      position: absolute;
      inset-inline-start: 0.55rem;
      inset-block-start: 1.15rem;
      width: 0.55rem;
      height: 0.55rem;
      border: 2px solid var(--epoch-color-out-of-bounds);
      border-radius: 50%;
    }
    .ops-queue-count {
      display: inline-block;
      margin-inline-start: var(--epoch-space-sm);
      padding: 0 var(--epoch-space-sm);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-out-of-bounds);
      color: var(--epoch-color-surface-raised);
      font-size: var(--epoch-type-label-size);
      font-weight: var(--epoch-type-label-weight);
      vertical-align: middle;
    }
    .ops-card-actions {
      margin: 0;
      font-size: var(--epoch-type-label-size);
    }

    .ops-card p {
      margin: 0;
      color: var(--epoch-color-muted);
      line-height: 1.55;
    }

    .card-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .status {
      border-radius: var(--epoch-radius-sm);
      background: color-mix(in srgb, var(--epoch-color-teal) 12%, transparent);
      color: var(--epoch-color-teal);
      font-size: 0.78rem;
      font-weight: 800;
      padding: 0.35rem 0.55rem;
      white-space: nowrap;
    }

    .card-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .provenance-note {
      border-inline-start: 1px solid var(--epoch-color-line-strong);
      padding-inline-start: 0.7rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .runner-list,
    .activity-list,
    .policy-list {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .runner-list li,
    .activity-list li,
    .policy-list li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-top: 1px solid var(--epoch-color-line);
      padding-top: 0.5rem;
    }

    code {
      overflow-wrap: anywhere;
      color: var(--epoch-color-muted);
    }

    .empty { border-style: dashed; }

    @media (max-width: 820px) {
      .ops-header,
      .ops-grid {
        grid-template-columns: 1fr;
      }

      .ops-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .ops-header,
      .ops-tabs,
      .ops-grid {
        width: min(100% - 1rem, 1180px);
      }

      .card-header,
      .actions {
        align-items: stretch;
        flex-direction: column;
      }

      .card-facts { grid-template-columns: 1fr; }
    }`;
}
