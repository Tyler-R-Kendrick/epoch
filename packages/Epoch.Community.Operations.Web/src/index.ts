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
export type CommunityOperationsAction = "Create Preview" | "Open Logs" | "Promote" | "Rollback" | "Re-run Workflow" | "Open Sandbox Result";

export interface CommunityWorkflowAutomation {
  readonly id: string;
  readonly name: string;
  readonly source: CommunityWorkflowAutomationSource;
  readonly workflowPath: string;
  readonly trigger: string;
}

export interface CommunityWorkflowRun {
  readonly id: string;
  readonly automationId: string;
  readonly jobId?: string;
  readonly state: CommunityOperationsRunState;
  readonly signedEventId: string;
}

export interface CommunityAgentSandboxRun {
  readonly id: string;
  readonly aiPlanId: string;
  readonly agent: string;
  readonly provider: string;
  readonly model: string;
  readonly policy: string;
  readonly state: AiActionPlan["state"] | "failed";
  readonly inputIntentId: string;
  readonly outputPatchId: string;
  readonly signedEventId: string;
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
  readonly workflowAutomations: readonly CommunityWorkflowAutomation[];
  readonly workflowRuns: readonly CommunityWorkflowRun[];
  readonly agentSandboxes: readonly CommunityAgentSandboxRun[];
  readonly runnerSummary: CommunityRunnerSummary;
  readonly activity: readonly CommunityOperationsActivity[];
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
      themeColor: "#17221f",
      backgroundColor: "#f4f7f5",
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
    workflowAutomations: [...(options.workflowAutomations ?? [])],
    workflowRuns: workflowRunsWithPlatformJobs(snapshot, options.workflowRuns ?? []),
    agentSandboxes: sandboxRunsWithPlatformPlans(snapshot, options.sandboxRuns ?? []),
    runnerSummary: runnerSummary(snapshot.runners),
    activity: activityFromAudit(snapshot.auditEvents, snapshot.platformEvents),
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
        <p class="lede">${escapeHtml(app.projectScope.displayName)} project operations, preview deploys, GitHub Actions-style workflows, and agent sandboxes.</p>
      </div>
      <dl class="ops-summary" aria-label="Operations summary">
        <div><dt>Apps</dt><dd>${app.hostedApps.length}</dd></div>
        <div><dt>Workflows</dt><dd>${app.workflowRuns.length}</dd></div>
        <div><dt>Sandboxes</dt><dd>${app.agentSandboxes.length}</dd></div>
        <div><dt>Runners</dt><dd>${app.runnerSummary.onlineRunners}</dd></div>
      </dl>
    </header>
    <nav class="ops-tabs" aria-label="Community operations sections">
      <a href="#apps">Apps</a>
      <a href="#previews">Previews</a>
      <a href="#workflows">Workflows</a>
      <a href="#sandboxes">Agent Sandboxes</a>
      <a href="#runners">Runners</a>
      <a href="#activity">Activity</a>
    </nav>
    <section id="operations-content" class="ops-grid" aria-label="Community operations dashboard">
      <section id="apps" class="ops-section" aria-labelledby="apps-title">
        <h2 id="apps-title">Apps</h2>
        ${app.hostedApps.length === 0 ? emptyCard("No hosted apps", "Connect Platform state to show deployable apps here.") : app.hostedApps.map(renderHostedApp).join("")}
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
      state: plan?.state ?? run.state,
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
      <div><dt>Job</dt><dd>${escapeHtml(latestRun?.jobId ?? "not scheduled")}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(latestRun?.signedEventId ?? "pending")}</dd></div>
    </dl>
    <div class="actions">${renderAction("Re-run Workflow")}</div>
  </article>`;
}

function renderSandbox(sandbox: CommunityAgentSandboxRun): string {
  return `<article class="ops-card">
    <div class="card-header">
      <div>
        <p class="eyebrow">${escapeHtml(sandbox.provider)} / ${escapeHtml(sandbox.model)}</p>
        <h3>${escapeHtml(sandbox.agent)}</h3>
      </div>
      <span class="status">${escapeHtml(sandbox.state)}</span>
    </div>
    <p>Policy ${escapeHtml(sandbox.policy)} converted ${escapeHtml(sandbox.inputIntentId)} into ${escapeHtml(sandbox.outputPatchId)}.</p>
    <dl class="card-facts">
      <div><dt>AI plan</dt><dd>${escapeHtml(sandbox.aiPlanId)}</dd></div>
      <div><dt>Signed event</dt><dd>${escapeHtml(sandbox.signedEventId)}</dd></div>
    </dl>
    <div class="actions">${renderAction("Open Sandbox Result")}</div>
  </article>`;
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
  return `    :root {
      color-scheme: light;
      --ops-surface: #f4f7f5;
      --ops-card: #ffffff;
      --ops-ink: #17221f;
      --ops-muted: #60706a;
      --ops-line: #cbd8d3;
      --ops-accent: #2f7370;
      --ops-action: #ba5e3f;
      --ops-good: #2d7a46;
      --ops-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      letter-spacing: 0;
      background: var(--ops-surface);
    }

    * { box-sizing: border-box; }

    body {
      min-width: 320px;
      margin: 0;
      color: var(--ops-ink);
      background: var(--ops-surface);
    }

    a { color: inherit; }

    a:focus-visible {
      outline: 3px solid rgba(186, 94, 63, 0.42);
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset-block-start: 1rem;
      inset-inline-start: 1rem;
      z-index: 10;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--ops-ink);
      border-radius: 4px;
      background: var(--ops-card);
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
      color: var(--ops-action);
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1, h2, h3, p { overflow-wrap: break-word; }

    h1 {
      margin: 0;
      font-size: 2.75rem;
      line-height: 1;
    }

    h2 {
      margin: 0;
      font-size: 1.15rem;
    }

    h3 {
      margin: 0;
      font-size: 1rem;
    }

    .lede {
      max-width: 62ch;
      margin: 1rem 0 0;
      color: var(--ops-muted);
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
      border: 1px solid var(--ops-line);
      border-radius: var(--ops-radius);
      background: var(--ops-card);
    }

    dt {
      color: var(--ops-muted);
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
      min-height: 40px;
      align-items: center;
      justify-content: center;
      padding: 0.58rem 0.75rem;
      border: 1px solid var(--ops-line);
      border-radius: 4px;
      background: var(--ops-card);
      font-weight: 750;
      text-decoration: none;
      white-space: nowrap;
    }

    .actions a:first-child {
      border-color: var(--ops-action);
      background: var(--ops-action);
      color: #ffffff;
    }

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
      border: 1px solid var(--ops-line);
      border-radius: var(--ops-radius);
      background: var(--ops-card);
      box-shadow: 0 1px 0 rgba(23, 34, 31, 0.05);
    }

    .ops-card p {
      margin: 0;
      color: var(--ops-muted);
      line-height: 1.55;
    }

    .card-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .status {
      border-radius: 999px;
      background: rgba(47, 115, 112, 0.12);
      color: var(--ops-accent);
      font-size: 0.78rem;
      font-weight: 800;
      padding: 0.35rem 0.55rem;
      white-space: nowrap;
    }

    .card-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .provenance-note {
      border-inline-start: 3px solid var(--ops-good);
      padding-inline-start: 0.7rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .runner-list,
    .activity-list {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .runner-list li,
    .activity-list li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-top: 1px solid var(--ops-line);
      padding-top: 0.5rem;
    }

    code {
      overflow-wrap: anywhere;
      color: var(--ops-muted);
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

      h1 { font-size: 2.15rem; }

      .card-header,
      .actions {
        align-items: stretch;
        flex-direction: column;
      }

      .card-facts { grid-template-columns: 1fr; }
    }`;
}
