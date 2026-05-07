export type PlatformConsoleModel = {
  role: "operator" | "developer" | "maintainer" | "incident-responder";
  productionReady: boolean;
  projectName: string;
  environmentName: string;
  deployableName: string;
  primaryAction: string;
  deploymentHealth: "healthy" | "degraded" | "unknown";
  communityEnabled: boolean;
  communityModerationState?: string;
  runnerCount?: number;
  latestDeploymentState?: string;
  packageName?: string;
  packageVersion?: string;
  searchResults?: PlatformConsoleSearchResult[];
  communityFollowers?: number;
  communityStars?: number;
  communityProjectPage?: PlatformConsoleCommunityProjectPage;
  communityFeed?: string[];
  moderationQueueCount?: number;
  mobileActions?: string[];
  homeModules?: string[];
  adminSections?: string[];
  tableColumns?: string[];
  confirmationResource?: string;
  sdkEquivalent?: string;
};

export type PlatformConsoleCommunityProjectPage = {
  publicSlug: string;
  readme: string;
  deployStatusBadge: string;
  contributionPrompt: string;
  bookmarksCount: number;
  discussionsCount: number;
};

export type PlatformConsoleSearchResult = {
  type: "repository" | "deployable" | "package";
  label: string;
};

export function renderPlatformConsole(container: Element | null, model: PlatformConsoleModel): void {
  if (container === null) {
    throw new Error("renderPlatformConsole requires a container element.");
  }

  const navigationMode = globalThis.window?.innerWidth !== undefined && globalThis.window.innerWidth <= 640 ? "mobile" : "desktop";
  const navItems = navigationItems(navigationMode, model.communityEnabled);

  container.innerHTML = `
    <section class="epoch-platform-shell" data-epoch-platform-ready="true" data-navigation-mode="${navigationMode}">
      <style>${styles()}</style>
      <header class="epoch-platform-header">
        <div>
          <p class="epoch-platform-kicker">${escapeHtml(model.role)} console</p>
          <h1>Epoch.Platform</h1>
        </div>
        <button class="epoch-platform-ai" aria-label="Ask AI about platform">AI</button>
        <button class="epoch-platform-command" aria-label="Open command palette">⌘K</button>
      </header>
      <nav class="epoch-platform-nav epoch-platform-nav-${navigationMode}" aria-label="Primary">
        ${navItems.map((item) => `<a href="#${escapeAttribute(item.toLowerCase())}">${escapeHtml(item)}</a>`).join("")}
      </nav>
      <main class="epoch-platform-main">
        <section class="epoch-platform-status" aria-label="Platform status">
          <span class="epoch-platform-state ${model.productionReady ? "ready" : "blocked"}">${model.productionReady ? "Production ready" : "Setup incomplete"}</span>
          <span class="epoch-platform-health">Deployment health: ${escapeHtml(model.deploymentHealth)}</span>
        </section>
        <section class="epoch-platform-work">
          <p class="epoch-platform-scope">${escapeHtml(model.projectName)} / ${escapeHtml(model.environmentName)} / ${escapeHtml(model.deployableName)}</p>
          <h2>Operate ${escapeHtml(model.deployableName)}</h2>
          <p>Review the current environment, deploy safely, and keep rollback context close.</p>
          <button class="epoch-platform-primary">${escapeHtml(model.primaryAction)}</button>
        </section>
        ${operationalPanel(model)}
        ${packagePanel(model)}
        ${searchPanel(model)}
        ${homePanel(model)}
        ${adminPanel(model)}
        ${dataPanel(model)}
        ${mobileActionPanel(model)}
        ${communityPanel(model)}
      </main>
    </section>
  `;
}

function navigationItems(navigationMode: string, communityEnabled: boolean): string[] {
  if (navigationMode === "mobile") {
    return ["Home", "Projects", "Deployments", "Reviews", "More"];
  }
  const navItems = ["Home", "Projects", "Repositories", "Deployments", "Infrastructure", "Issues", "Reviews", "Packages", "Observability", "Admin"];
  if (communityEnabled) {
    navItems.splice(navItems.length - 1, 0, "Community");
  }
  return navItems;
}

function operationalPanel(model: PlatformConsoleModel): string {
  if (model.runnerCount === undefined && model.latestDeploymentState === undefined) {
    return "";
  }
  return `
    <section class="epoch-platform-panel" aria-label="Operational telemetry">
      <h2>Operations</h2>
      <dl class="epoch-platform-metrics">
        <div>
          <dt>Runners</dt>
          <dd>${escapeHtml(pluralize(model.runnerCount ?? 0, "runner"))} online</dd>
        </div>
        <div>
          <dt>Deploy</dt>
          <dd>Latest deploy: ${escapeHtml(model.latestDeploymentState ?? "unknown")}</dd>
        </div>
      </dl>
    </section>
  `;
}

function packagePanel(model: PlatformConsoleModel): string {
  if (model.packageName === undefined || model.packageVersion === undefined) {
    return "";
  }
  return `
    <section class="epoch-platform-panel" aria-label="Package distribution">
      <h2>Packages</h2>
      <p class="epoch-platform-artifact">${escapeHtml(model.packageName)} ${escapeHtml(model.packageVersion)}</p>
    </section>
  `;
}

function searchPanel(model: PlatformConsoleModel): string {
  if (model.searchResults === undefined || model.searchResults.length === 0) {
    return "";
  }
  return `
    <section class="epoch-platform-panel" aria-label="Search results">
      <h2>Search</h2>
      <ul class="epoch-platform-list">
        ${model.searchResults.map((result) => `<li>${escapeHtml(result.label)} <span>${escapeHtml(result.type)}</span></li>`).join("")}
      </ul>
    </section>
  `;
}

function homePanel(model: PlatformConsoleModel): string {
  if (model.homeModules === undefined || model.homeModules.length === 0) {
    return "";
  }
  return `
    <section class="epoch-platform-panel" aria-label="Role-aware home">
      <h2>Home</h2>
      <ul class="epoch-platform-list">
        ${model.homeModules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function adminPanel(model: PlatformConsoleModel): string {
  if (model.adminSections === undefined || model.adminSections.length === 0) {
    return "";
  }
  return `
    <section class="epoch-platform-panel" aria-label="Admin governance">
      <h2>Admin</h2>
      <ul class="epoch-platform-list">
        ${model.adminSections.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function dataPanel(model: PlatformConsoleModel): string {
  if ((model.tableColumns === undefined || model.tableColumns.length === 0) && model.confirmationResource === undefined && model.sdkEquivalent === undefined) {
    return "";
  }
  return `
    <section class="epoch-platform-panel" aria-label="Dense operational data">
      <h2>Data</h2>
      <div class="epoch-platform-table" role="table">
        <div role="row">
          ${(model.tableColumns ?? []).map((column) => `<span role="columnheader">${escapeHtml(column)}</span>`).join("")}
        </div>
      </div>
      ${model.confirmationResource === undefined ? "" : `<p class="epoch-platform-artifact">Confirm ${escapeHtml(model.confirmationResource)}</p>`}
      ${model.sdkEquivalent === undefined ? "" : `<code>${escapeHtml(model.sdkEquivalent)}</code>`}
    </section>
  `;
}

function mobileActionPanel(model: PlatformConsoleModel): string {
  if (model.mobileActions === undefined || model.mobileActions.length === 0) {
    return "";
  }
  const primaryAction = model.mobileActions.includes("Rollback") ? "Rollback" : model.primaryAction;
  return `
    <section class="epoch-platform-panel epoch-platform-mobile-actions" aria-label="Mobile task actions">
      <h2>Actions</h2>
      <button class="epoch-platform-primary">${escapeHtml(primaryAction)}</button>
      <div>
        ${model.mobileActions.filter((action) => action !== primaryAction).map((action) => `<button>${escapeHtml(action)}</button>`).join("")}
      </div>
    </section>
  `;
}

function communityPanel(model: PlatformConsoleModel): string {
  if (!model.communityEnabled) {
    return "";
  }
  return `
    <aside class="epoch-platform-community" aria-label="Community activity">
      <h2>Community</h2>
      <p class="epoch-platform-community-state">Community review: ${escapeHtml(model.communityModerationState ?? "unpublished")}</p>
      ${communityProjectPage(model)}
      <dl class="epoch-platform-metrics">
        <div>
          <dt>Followers</dt>
          <dd>${escapeHtml(pluralize(model.communityFollowers ?? 0, "follower"))}</dd>
        </div>
        <div>
          <dt>Stars</dt>
          <dd>${escapeHtml(pluralize(model.communityStars ?? 0, "star"))}</dd>
        </div>
      </dl>
      <ul class="epoch-platform-list">
        ${(model.communityFeed ?? []).map((event) => `<li>${escapeHtml(event)}</li>`).join("")}
      </ul>
    </aside>
    <aside class="epoch-platform-panel" aria-label="Community moderation">
      <h2>Moderation</h2>
      <p class="epoch-platform-artifact">${escapeHtml(pluralize(model.moderationQueueCount ?? 0, "moderation item"))}</p>
    </aside>
  `;
}

function communityProjectPage(model: PlatformConsoleModel): string {
  if (model.communityProjectPage === undefined) {
    return "";
  }
  const page = model.communityProjectPage;
  return `
    <section class="epoch-platform-showcase" aria-label="Community project showcase">
      <h3>${escapeHtml(page.publicSlug)}</h3>
      <p>${escapeHtml(page.readme)}</p>
      <p class="epoch-platform-artifact">Deploy badge: ${escapeHtml(page.deployStatusBadge)}</p>
      <p>${escapeHtml(page.contributionPrompt)}</p>
      <dl class="epoch-platform-metrics">
        <div>
          <dt>Bookmarks</dt>
          <dd>${escapeHtml(pluralize(page.bookmarksCount, "bookmark"))}</dd>
        </div>
        <div>
          <dt>Discussions</dt>
          <dd>${escapeHtml(pluralize(page.discussionsCount, "discussion"))}</dd>
        </div>
      </dl>
    </section>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll(" ", "-");
}

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function styles(): string {
  return `
    .epoch-platform-shell {
      min-height: 100vh;
      background: #f6f8fa;
      color: #1f2328;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: grid;
      grid-template-rows: auto auto 1fr;
    }
    .epoch-platform-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #d0d7de;
      background: #ffffff;
    }
    .epoch-platform-header h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
    }
    .epoch-platform-kicker {
      margin: 0 0 2px;
      color: #57606a;
      font-size: 12px;
      text-transform: uppercase;
    }
    .epoch-platform-ai,
    .epoch-platform-command,
    .epoch-platform-primary {
      min-height: 44px;
      border: 1px solid #1f883d;
      border-radius: 6px;
      background: #1f883d;
      color: #ffffff;
      font-weight: 600;
      padding: 0 14px;
    }
    .epoch-platform-command {
      margin-left: 8px;
      border-color: #d0d7de;
      background: #ffffff;
      color: #24292f;
    }
    .epoch-platform-nav {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      border-bottom: 1px solid #d0d7de;
      background: #ffffff;
      overflow-x: auto;
    }
    .epoch-platform-nav a {
      color: #24292f;
      text-decoration: none;
      padding: 8px 10px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .epoch-platform-nav a:first-child {
      background: #eaeef2;
      font-weight: 600;
    }
    .epoch-platform-main {
      display: grid;
      gap: 12px;
      padding: 12px;
      max-width: 1120px;
      width: 100%;
      margin: 0 auto;
    }
    .epoch-platform-status,
    .epoch-platform-work,
    .epoch-platform-panel,
    .epoch-platform-community {
      background: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      padding: 14px;
    }
    .epoch-platform-status {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .epoch-platform-state,
    .epoch-platform-health {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .epoch-platform-state.ready {
      color: #116329;
      background: #dafbe1;
    }
    .epoch-platform-state.blocked {
      color: #9a6700;
      background: #fff8c5;
    }
    .epoch-platform-health {
      color: #57606a;
      background: #f6f8fa;
    }
    .epoch-platform-scope {
      margin: 0 0 8px;
      color: #57606a;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 13px;
    }
    .epoch-platform-work h2,
    .epoch-platform-panel h2,
    .epoch-platform-community h2 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .epoch-platform-work p {
      margin: 0 0 14px;
      color: #57606a;
    }
    .epoch-platform-metrics {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      margin: 0;
    }
    .epoch-platform-metrics div {
      min-width: 0;
    }
    .epoch-platform-metrics dt {
      color: #57606a;
      font-size: 12px;
    }
    .epoch-platform-metrics dd {
      margin: 2px 0 0;
      font-weight: 600;
    }
    .epoch-platform-artifact,
    .epoch-platform-community-state {
      margin: 0;
      font-weight: 600;
    }
    .epoch-platform-list {
      list-style: none;
      padding: 0;
      margin: 10px 0 0;
      display: grid;
      gap: 6px;
    }
    .epoch-platform-list li {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid #d8dee4;
      padding-top: 6px;
    }
    .epoch-platform-list span {
      color: #57606a;
    }
    .epoch-platform-table div {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
      gap: 8px;
      font-weight: 600;
    }
    .epoch-platform-panel code {
      display: block;
      margin-top: 10px;
      color: #24292f;
      background: #f6f8fa;
      border: 1px solid #d8dee4;
      border-radius: 6px;
      padding: 8px;
      overflow-wrap: anywhere;
    }
    .epoch-platform-mobile-actions div {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .epoch-platform-mobile-actions button {
      min-height: 44px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: #ffffff;
      color: #24292f;
      padding: 0 12px;
    }
    [data-navigation-mode="desktop"] .epoch-platform-main {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
    [data-navigation-mode="desktop"] .epoch-platform-status {
      grid-column: 1 / -1;
    }
    [data-navigation-mode="mobile"] {
      padding-bottom: 64px;
    }
    .epoch-platform-nav-mobile {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 5;
      justify-content: space-around;
      border-top: 1px solid #d0d7de;
      border-bottom: 0;
    }
  `;
}
