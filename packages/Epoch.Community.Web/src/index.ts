import type {
  CommunityClient,
  CommunityRepository,
  CommunityWorkflow,
  CommunityWorkflowId,
} from "@epoch/community-core";

export interface PwaAppDescriptor {
  readonly name: string;
  readonly shortName: string;
  readonly startUrl: string;
  readonly display: "standalone";
  readonly themeColor: string;
  readonly backgroundColor: string;
  readonly offlineShell: boolean;
}

export interface CommunityRoute {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly workflow: CommunityWorkflowId;
}

export interface CommunityNavigationItem {
  readonly label: string;
  readonly routeId: string;
}

export interface CommunityDeploymentTarget {
  readonly id: "epoch-community";
  readonly kind: "community-webapp";
  readonly displayName: "Epoch Community";
  readonly version: string;
  readonly image: string;
  readonly route: string;
  readonly healthPath: string;
  readonly ports: readonly number[];
  readonly environment: readonly string[];
  readonly requiredServices: readonly string[];
}

export interface CommunityWebAppDefinition {
  readonly project: "Epoch.Community.Web";
  readonly product: "epoch-community";
  readonly pwa: PwaAppDescriptor;
  readonly routes: readonly CommunityRoute[];
  readonly navigation: readonly CommunityNavigationItem[];
  readonly workflows: readonly CommunityWorkflow[];
  readonly repositories: readonly CommunityRepository[];
  readonly deploymentTarget: CommunityDeploymentTarget;
}

export interface CreateCommunityWebAppOptions {
  readonly client: CommunityClient;
  readonly basePath?: string;
  readonly version?: string;
  readonly image?: string;
}

export async function createCommunityWebApp(
  options: CreateCommunityWebAppOptions,
): Promise<CommunityWebAppDefinition> {
  const basePath = normalizedBasePath(options.basePath ?? "/community");
  const workflows = await options.client.listWorkflows();
  const repositories = await options.client.listRepositories();
  const routes = createCommunityRoutes(basePath, workflows);

  return {
    project: "Epoch.Community.Web",
    product: "epoch-community",
    pwa: {
      name: "Epoch Community",
      shortName: "Epoch Community",
      startUrl: basePath,
      display: "standalone",
      themeColor: "#17221f",
      backgroundColor: "#eef3f1",
      offlineShell: true,
    },
    routes,
    navigation: routes.map((route) => ({ label: route.label, routeId: route.id })),
    workflows,
    repositories,
    deploymentTarget: createCommunityDeploymentTarget({
      basePath,
      version: options.version,
      image: options.image,
    }),
  };
}

export function createCommunityDeploymentTarget(options: {
  readonly basePath?: string;
  readonly version?: string;
  readonly image?: string;
} = {}): CommunityDeploymentTarget {
  return {
    id: "epoch-community",
    kind: "community-webapp",
    displayName: "Epoch Community",
    version: options.version ?? "0.1.0",
    image: options.image ?? "ghcr.io/epoch/community-web:0.1.0",
    route: normalizedBasePath(options.basePath ?? "/community"),
    healthPath: "/healthz",
    ports: [8080],
    environment: [
      "EPOCH_COMMUNITY_API_URL",
      "EPOCH_COMMUNITY_BASE_URL",
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

export function renderCommunityWebDocument(app: CommunityWebAppDefinition): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(app.pwa.themeColor)}">
  <title>${escapeHtml(app.pwa.name)}</title>
  <style>
${communityStyles()}
  </style>
</head>
<body>
  <a class="skip-link" href="#community-content">Skip to content</a>
  <main id="epoch-community" data-design-system="epoch-community">
    <header class="hero-shell" aria-label="Epoch Community overview">
      <nav class="topbar" aria-label="Primary">
        <a class="brand" href="${escapeHtml(app.pwa.startUrl)}" translate="no">
          <span class="brand-mark" aria-hidden="true">EC</span>
          <span>${escapeHtml(app.pwa.name)}</span>
        </a>
        <a class="topbar-link" href="${escapeHtml(routeFor(app, "release-discovery"))}">Latest Releases</a>
      </nav>
      <div class="hero-grid">
        <section class="hero-copy">
          <p class="eyebrow">Signed collaboration for repository history</p>
          <h1>${escapeHtml(app.pwa.name)}</h1>
          <p class="lede">A focused community surface for browsing Epoch repositories, reviewing signed intents, following releases, and understanding who maintains the work.</p>
          <div class="hero-actions" aria-label="Primary community actions">
            <a class="button button-primary" href="#repositories">Browse Repositories</a>
            <a class="button button-secondary" href="${escapeHtml(routeFor(app, "change-review"))}">Review Changes</a>
          </div>
        </section>
        <aside class="history-panel" aria-label="Signed history preview">
          ${renderHistoryGraph(app)}
        </aside>
      </div>
    </header>
    <nav class="workflow-rail" aria-label="Community workflows">
      ${app.workflows.map((workflow) => renderWorkflowLink(app, workflow)).join("")}
    </nav>
    <section id="community-content" class="content-shell" aria-labelledby="repositories-title">
      <div class="section-heading">
        <p class="eyebrow">Public workspace</p>
        <h2 id="repositories-title">Repositories</h2>
        <p>Repository cards foreground maintainers, workflow counts, topics, and the next useful action.</p>
      </div>
      <div id="repositories" class="repo-grid">
        ${app.repositories.length === 0 ? renderEmptyRepositories() : app.repositories.map((repository) => renderRepository(app, repository)).join("")}
      </div>
    </section>
  </main>
</body>
</html>`;
}

function createCommunityRoutes(
  basePath: string,
  workflows: readonly CommunityWorkflow[],
): readonly CommunityRoute[] {
  return workflows.map((workflow) => ({
    id: workflow.id,
    path: `${basePath}/${workflow.id}`,
    label: workflow.label,
    workflow: workflow.id,
  }));
}

function normalizedBasePath(path: string): string {
  const prefixed = path.startsWith("/") ? path : `/${path}`;
  return prefixed.endsWith("/") && prefixed.length > 1 ? prefixed.slice(0, -1) : prefixed;
}

function renderWorkflowLink(app: CommunityWebAppDefinition, workflow: CommunityWorkflow): string {
  return `<a class="workflow-link" href="${escapeHtml(routeFor(app, workflow.id))}">
    <span class="workflow-label">${escapeHtml(workflow.label)}</span>
    <span class="workflow-purpose">${escapeHtml(workflow.purpose)}</span>
  </a>`;
}

function renderRepository(app: CommunityWebAppDefinition, repository: CommunityRepository): string {
  const repositoryRoute = `${routeFor(app, "repository-browsing")}?repo=${encodeURIComponent(repository.slug)}`;
  const issueRoute = `${routeFor(app, "issue-tracking")}?repo=${encodeURIComponent(repository.slug)}`;
  const changeRoute = `${routeFor(app, "change-review")}?repo=${encodeURIComponent(repository.slug)}`;

  return `<article class="repo-card" data-repository="${escapeHtml(repository.slug)}">
    <div class="repo-card-header">
      <div>
        <p class="repo-visibility">${escapeHtml(repository.visibility)}</p>
        <h3>${escapeHtml(repository.slug)}</h3>
      </div>
      <a class="repo-open-link" href="${escapeHtml(repositoryRoute)}">Open</a>
    </div>
    <p>${escapeHtml(repository.description)}</p>
    ${renderRepositoryTopics(repository)}
    <dl class="repo-facts" aria-label="${escapeHtml(repository.slug)} activity">
      <div>
        <dt>Maintainers</dt>
        <dd>${repository.maintainers.map(escapeHtml).join(", ")}</dd>
      </div>
      <div>
        <dt>Issues</dt>
        <dd>${repository.issues.length}</dd>
      </div>
      <div>
        <dt>Change Proposals</dt>
        <dd>${repository.changeProposals.length}</dd>
      </div>
    </dl>
    <div class="repo-actions" aria-label="${escapeHtml(repository.slug)} actions">
      <a href="${escapeHtml(issueRoute)}">View Issues</a>
      <a href="${escapeHtml(changeRoute)}">Review Changes</a>
    </div>
  </article>`;
}

function renderRepositoryTopics(repository: CommunityRepository): string {
  if (repository.topics.length === 0) {
    return `<p class="topic-empty">Default view: ${escapeHtml(repository.defaultView)}</p>`;
  }

  return `<ul class="topic-list" aria-label="${escapeHtml(repository.slug)} topics">
    ${repository.topics.map((topic) => `<li>${escapeHtml(topic)}</li>`).join("")}
  </ul>`;
}

function renderEmptyRepositories(): string {
  return `<article class="repo-card empty-state">
    <p class="repo-visibility">Empty State</p>
    <h3>No repositories yet</h3>
    <p>Connect a Community API source to show repository browsing, issues, change reviews, discussions, and releases here.</p>
  </article>`;
}

function renderHistoryGraph(app: CommunityWebAppDefinition): string {
  const issueCount = app.repositories.reduce((count, repository) => count + repository.issues.length, 0);
  const changeCount = app.repositories.reduce((count, repository) => count + repository.changeProposals.length, 0);
  const discussionCount = app.repositories.reduce((count, repository) => count + repository.discussions.length, 0);

  return `<div class="history-graph">
    <svg role="img" aria-labelledby="history-graph-title history-graph-desc" width="420" height="250" viewBox="0 0 420 250">
      <title id="history-graph-title">Signed event graph</title>
      <desc id="history-graph-desc">A simplified graph of repository, issue, review, and release events converging into verified history.</desc>
      <path class="graph-rail" d="M44 186 C104 112 164 216 220 134 S318 64 376 104" />
      <path class="graph-rail graph-rail-muted" d="M42 78 C104 122 142 42 206 74 S302 168 376 134" />
      <circle class="graph-node graph-node-accent" cx="44" cy="186" r="11" />
      <circle class="graph-node" cx="118" cy="126" r="9" />
      <circle class="graph-node graph-node-teal" cx="205" cy="74" r="12" />
      <circle class="graph-node" cx="220" cy="134" r="9" />
      <circle class="graph-node graph-node-gold" cx="304" cy="86" r="10" />
      <circle class="graph-node" cx="376" cy="134" r="12" />
    </svg>
    <dl class="history-stats" aria-label="Community totals">
      <div>
        <dt>Repositories</dt>
        <dd>${app.repositories.length}</dd>
      </div>
      <div>
        <dt>Issues</dt>
        <dd>${issueCount}</dd>
      </div>
      <div>
        <dt>Reviews</dt>
        <dd>${changeCount}</dd>
      </div>
      <div>
        <dt>Discussions</dt>
        <dd>${discussionCount}</dd>
      </div>
    </dl>
  </div>`;
}

function routeFor(app: CommunityWebAppDefinition, workflowId: CommunityWorkflowId): string {
  return app.routes.find((route) => route.workflow === workflowId)?.path ?? app.pwa.startUrl;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function communityStyles(): string {
  return `    :root {
      color-scheme: light;
      --epoch-color-surface: #eef3f1;
      --epoch-color-surface-raised: #fbfbf8;
      --epoch-color-ink: #17221f;
      --epoch-color-muted: #5f6a65;
      --epoch-color-line: #cad8d2;
      --epoch-color-accent: #ba5e3f;
      --epoch-color-accent-strong: #843927;
      --epoch-color-teal: #2f7370;
      --epoch-color-mint: #d8ece5;
      --epoch-color-gold: #d8b765;
      --epoch-shadow-low: 0 16px 40px rgba(23, 34, 31, 0.08);
      --epoch-radius-sm: 4px;
      --epoch-radius-md: 8px;
      --epoch-space-1: 0.5rem;
      --epoch-space-2: 0.75rem;
      --epoch-space-3: 1rem;
      --epoch-space-4: 1.5rem;
      --epoch-space-5: 2rem;
      --epoch-space-6: 3rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 16px;
      letter-spacing: 0;
      background: var(--epoch-color-surface);
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      min-width: 320px;
      margin: 0;
      color: var(--epoch-color-ink);
      background:
        linear-gradient(90deg, rgba(47, 115, 112, 0.08) 1px, transparent 1px),
        linear-gradient(180deg, rgba(47, 115, 112, 0.06) 1px, transparent 1px),
        var(--epoch-color-surface);
      background-size: 42px 42px;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: rgba(186, 94, 63, 0.18);
      text-rendering: optimizeLegibility;
      touch-action: manipulation;
    }

    a {
      color: inherit;
      text-decoration-thickness: 1px;
      text-underline-offset: 0.2em;
    }

    a:hover {
      color: var(--epoch-color-accent-strong);
    }

    a:focus-visible {
      outline: 3px solid rgba(186, 94, 63, 0.42);
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset-block-start: var(--epoch-space-3);
      inset-inline-start: var(--epoch-space-3);
      z-index: 10;
      padding: var(--epoch-space-2) var(--epoch-space-3);
      border: 1px solid var(--epoch-color-ink);
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      transform: translateY(-140%);
      transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .skip-link:focus-visible {
      transform: translateY(0);
    }

    #epoch-community {
      min-height: 100vh;
      overflow-x: hidden;
    }

    #community-content,
    #repositories {
      scroll-margin-top: var(--epoch-space-5);
    }

    .hero-shell {
      padding: max(var(--epoch-space-4), env(safe-area-inset-top)) var(--epoch-space-4) var(--epoch-space-6);
      background: linear-gradient(135deg, rgba(216, 236, 229, 0.92), rgba(238, 243, 241, 0.84));
      border-block-end: 1px solid var(--epoch-color-line);
    }

    .topbar,
    .hero-grid,
    .workflow-rail,
    .content-shell {
      width: min(1160px, calc(100% - 2rem));
      margin-inline: auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--epoch-space-3);
      margin-block-end: var(--epoch-space-6);
    }

    .brand,
    .topbar-link,
    .button,
    .repo-open-link,
    .repo-actions a {
      border-radius: var(--epoch-radius-sm);
      font-weight: 700;
      text-decoration: none;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: var(--epoch-space-2);
      min-width: 0;
      font-size: 0.95rem;
    }

    .brand-mark {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border-radius: var(--epoch-radius-sm);
      background: var(--epoch-color-ink);
      color: var(--epoch-color-surface-raised);
      font-size: 0.75rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .topbar-link {
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--epoch-color-line);
      background: rgba(251, 251, 248, 0.62);
      color: var(--epoch-color-ink);
    }

    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.78fr);
      gap: var(--epoch-space-6);
      align-items: center;
    }

    .hero-copy {
      min-width: 0;
    }

    .eyebrow,
    .repo-visibility {
      margin: 0 0 var(--epoch-space-2);
      color: var(--epoch-color-accent-strong);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1,
    h2,
    h3,
    p {
      overflow-wrap: break-word;
    }

    h1 {
      max-width: 11ch;
      margin: 0;
      font-size: 4rem;
      line-height: 0.95;
      text-wrap: balance;
    }

    h2 {
      margin: 0;
      font-size: 1.85rem;
      line-height: 1.1;
      text-wrap: balance;
    }

    h3 {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.2;
    }

    .lede {
      max-width: 62ch;
      margin: var(--epoch-space-4) 0 0;
      color: var(--epoch-color-muted);
      font-size: 1.08rem;
      line-height: 1.7;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--epoch-space-2);
      margin-block-start: var(--epoch-space-5);
    }

    .button {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      padding: 0.78rem 1rem;
      border: 1px solid transparent;
      transition:
        background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .button:hover,
    .repo-open-link:hover,
    .repo-actions a:hover {
      transform: translateY(-1px);
    }

    .button-primary {
      background: var(--epoch-color-ink);
      color: var(--epoch-color-surface-raised);
    }

    .button-primary:hover {
      background: var(--epoch-color-accent-strong);
      color: var(--epoch-color-surface-raised);
    }

    .button-secondary {
      border-color: var(--epoch-color-line);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
    }

    .history-panel {
      min-width: 0;
      border: 1px solid rgba(23, 34, 31, 0.14);
      border-radius: var(--epoch-radius-md);
      background: rgba(251, 251, 248, 0.72);
      box-shadow: var(--epoch-shadow-low);
    }

    .history-graph {
      padding: var(--epoch-space-4);
    }

    .history-graph svg {
      display: block;
      width: 100%;
      height: auto;
    }

    .graph-rail {
      fill: none;
      stroke: var(--epoch-color-ink);
      stroke-linecap: round;
      stroke-width: 3;
    }

    .graph-rail-muted {
      opacity: 0.42;
      stroke: var(--epoch-color-teal);
    }

    .graph-node {
      fill: var(--epoch-color-surface-raised);
      stroke: var(--epoch-color-ink);
      stroke-width: 3;
    }

    .graph-node-accent {
      fill: var(--epoch-color-accent);
    }

    .graph-node-teal {
      fill: var(--epoch-color-teal);
    }

    .graph-node-gold {
      fill: var(--epoch-color-gold);
    }

    .history-stats,
    .repo-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--epoch-space-2);
      margin: var(--epoch-space-3) 0 0;
    }

    .history-stats div,
    .repo-facts div {
      min-width: 0;
    }

    dt {
      color: var(--epoch-color-muted);
      font-size: 0.78rem;
      font-weight: 700;
    }

    dd {
      margin: 0.15rem 0 0;
      color: var(--epoch-color-ink);
      font-size: 1rem;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .workflow-rail {
      display: grid;
      grid-template-columns: repeat(7, minmax(9.25rem, 1fr));
      gap: var(--epoch-space-2);
      margin-block: calc(-1 * var(--epoch-space-5)) var(--epoch-space-6);
      overflow-x: auto;
      padding: var(--epoch-space-2) 0 var(--epoch-space-3);
      scroll-padding-inline: var(--epoch-space-3);
    }

    .workflow-link {
      display: grid;
      gap: 0.28rem;
      min-height: 112px;
      min-width: 0;
      padding: var(--epoch-space-3);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-surface-raised);
      color: var(--epoch-color-ink);
      text-decoration: none;
      transition:
        border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .workflow-link:hover {
      border-color: rgba(186, 94, 63, 0.46);
      box-shadow: var(--epoch-shadow-low);
      transform: translateY(-2px);
    }

    .workflow-label {
      font-weight: 800;
    }

    .workflow-purpose {
      color: var(--epoch-color-muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .content-shell {
      padding-block-end: var(--epoch-space-6);
    }

    .section-heading {
      display: grid;
      gap: var(--epoch-space-2);
      max-width: 66ch;
      margin-block-end: var(--epoch-space-4);
    }

    .section-heading p:last-child {
      margin: 0;
      color: var(--epoch-color-muted);
      line-height: 1.6;
    }

    .repo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 310px), 1fr));
      gap: var(--epoch-space-3);
    }

    .repo-card {
      display: grid;
      gap: var(--epoch-space-3);
      min-width: 0;
      padding: var(--epoch-space-4);
      border: 1px solid var(--epoch-color-line);
      border-radius: var(--epoch-radius-md);
      background: var(--epoch-color-surface-raised);
      box-shadow: 0 1px 0 rgba(23, 34, 31, 0.04);
    }

    .repo-card-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: var(--epoch-space-3);
    }

    .repo-card p {
      margin: 0;
      color: var(--epoch-color-muted);
      line-height: 1.58;
    }

    .repo-open-link,
    .repo-actions a {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      padding: 0.55rem 0.72rem;
      border: 1px solid var(--epoch-color-line);
      background: var(--epoch-color-surface);
      transition:
        background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .repo-open-link {
      flex: 0 0 auto;
    }

    .repo-open-link:hover,
    .repo-actions a:hover {
      border-color: rgba(47, 115, 112, 0.45);
      background: var(--epoch-color-mint);
      color: var(--epoch-color-ink);
    }

    .topic-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .topic-list li,
    .topic-empty {
      border: 1px solid rgba(47, 115, 112, 0.24);
      border-radius: 999px;
      background: rgba(216, 236, 229, 0.6);
      color: var(--epoch-color-teal);
      font-size: 0.78rem;
      font-weight: 750;
      line-height: 1;
      padding: 0.45rem 0.6rem;
    }

    .repo-facts {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      padding-block-start: var(--epoch-space-3);
      border-block-start: 1px solid var(--epoch-color-line);
    }

    .repo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--epoch-space-2);
    }

    .empty-state {
      border-style: dashed;
    }

    @media (max-width: 860px) {
      .hero-grid {
        grid-template-columns: 1fr;
      }

      h1 {
        max-width: 100%;
        font-size: 3rem;
      }

      .history-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .hero-shell {
        padding-inline: var(--epoch-space-3);
      }

      .topbar,
      .hero-grid,
      .workflow-rail,
      .content-shell {
        width: min(100% - 1rem, 1160px);
      }

      .topbar {
        align-items: stretch;
        flex-direction: column;
        margin-block-end: var(--epoch-space-5);
      }

      .topbar-link {
        text-align: center;
      }

      h1 {
        font-size: 2.35rem;
      }

      .workflow-rail {
        grid-auto-columns: minmax(16rem, 82vw);
        grid-auto-flow: column;
        grid-template-columns: none;
      }

      .repo-card-header,
      .repo-actions,
      .hero-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .repo-facts {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }

      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }`;
}
